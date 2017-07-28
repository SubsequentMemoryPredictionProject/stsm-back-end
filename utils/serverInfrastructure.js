const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const _ = require('lodash');
const uuid = require('node-uuid');
const constants = require('constants');

const initServer = (serverName = 'STSM-Service',
                    httpPort = 80,
                    sslPort = 443,
                    controllersPath = path.join(__dirname, 'controllers'),
                    timeToLeaveLoadBalancer = 1000 * 20,
                    timeToKillWorker = 1000 * 120,
                    logger) => {

    const expressConfiguration = () => {
        return new Promise((resolve) => {
            const app = express();

            app.use(bodyParser.json({}));

            app.use((req, res, next) => {
                req.startTime = new Date();

                req.context = {
                    appName: serverName,
                    requestId: uuid.v4(),
                    initializer: {
                        path: req.path,
                        method: req.method
                    },
                    input: {}
                };

                if (!_.isEmpty(req.params)) _.extend(req.context.input, req.params);
                if (!_.isEmpty(req.query)) _.extend(req.context.input, req.query);
                if (!_.isEmpty(req.body)) _.extend(req.context.input, req.body);
                logger.info('request started', req.context);
                next();
            });

            app.use((req, res, next) => {
                let oldWrite = res.write,
                    oldEnd = res.end;
                let chunks = [];

                res.write = function (chunk) {
                    chunks.push(chunk);

                    oldWrite.apply(res, arguments);
                };

                // must be a function not arrow function due to the use of arguments keyword
                res.end = function (chunk) {
                    if (chunk) chunks.push(new Buffer(chunk));

                    let body = Buffer.concat(chunks).toString('utf8');
                    if (body.length <= 4000) { // 4K hard limiting on response
                        if (res.get('Content-Type') && res.get('Content-Type').indexOf('application/json') > -1) body = JSON.parse(body);

                        req.context.response = body;
                    }
                    req.context.status = res.statusCode;
                    req.context.rt = (new Date() - req.startTime);
                    logger.info('request finished', req.context);

                    oldEnd.apply(res, arguments);
                };

                next();
            });

            resolve(app);
        });
    };

    const serverLaunch = (app) => {
        return new Promise((resolve) => {
            const http = require('http'),
                https = require('https');

            const server = http.createServer(app);
            let sslServer;

            if (useSSL) {
                sslServer = https.createServer({
                    key: fs.readFileSync(sslKey),
                    cert: fs.readFileSync(sslCert),
                    ca: fs.readFileSync(sslCA),
                    secureProtocol: 'SSLv23_method',
                    secureOptions: constants.SSL_OP_NO_SSLv3
                }, app);
            }

            process.on('SIGINT', () => {
                logger.info(`-------- ${serverName} - start responding status not ok ------`);

                reportLBStatusNOK = true;

                if (_.isFunction(notificationHandler)) {
                    notificationHandler({
                        type: 'exit-load-balancer'
                    });
                }

                setTimeout(() => {
                    logger.info(`-------- Stopping ${serverName} Node ------`);
                    logger.info(`stopping pid: ${process.pid} ...`);
                    sslServer && sslServer.close(() => {
                        logger.info(process.pid + ' closed SSL incoming connections');
                    });
                    server.close(() => {
                        logger.info(process.pid + ' closed HTTP incoming connections');
                    });

                    if (_.isFunction(notificationHandler)) {
                        notificationHandler({
                            type: 'connection-shutdown'
                        });
                    }

                    setTimeout(() => {
                        logger.info(process.pid + ' worker † ssl RIP');
                        if (_.isFunction(notificationHandler)) {
                            notificationHandler({
                                type: 'die'
                            });
                        }
                        process.exit(0);
                    }, timeToKillWorker);
                }, timeToLeaveLoadBalancer);
            });

            _.each(fs.readdirSync(controllersPath), (controller) => {
                require(path.join(controllersPath, controller))(app);// eslint-disable-line global-require
            });


            app.use((err, req, res, next) => {
                if (res.headersSent) {
                    return next(err);
                }

                logger.error(`Url: ${req.url}\nMethod: ${req.method}\nError: ${err.message}\nStack: ${err.stack}`);
                res.status(500).send('Unexpected Error, go to the log for more details...');

                next();
            });

            server.listen(httpPort);
            sslServer && sslServer.listen(sslPort);

            logger.info(`-------- Starting ${serverName} Node ------`);
            logger.info(`Listening on port ${httpPort}`);
            logger.info(`pid: ${process.pid}`);

            app.get('/lb-status', (req, res) => {
                logger.info('load balancer healthCheck');
                if (reportLBStatusNOK) {
                    res.status(500).json({
                        statusCode: 500,
                        message: 'NOK'
                    });
                } else {
                    res.json(true);
                }
            });

            resolve(app);
        });
    };

    process.on('exit', (code) => {
        if (code > 0) {
            logger.error('Child is about to exit with code:', code);
        } else {
            logger.info('Child is about to exit with code:', code);
        }
    });

    process.on('uncaughtException', (err) => {
        logger.error(`Child had an Uncaught exception\nError: ${err.message}\nStack:${err.stack}`);
    });

    return Promise.resolve()
        .then(expressConfiguration)
        .then(serverLaunch)
        .catch((err) => {
            logger.error(`Error: ${err.message}\nStack:${err.stack}`);
        });
};

module.exports = {
    initServer
};