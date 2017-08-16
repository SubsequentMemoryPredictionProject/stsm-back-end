const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const _ = require('lodash');
const uuid = require('node-uuid');
const http = require('http');

// initializing server
const initServer = ({serverName, httpPort, controllersPath, timeToLeaveLoadBalancer, logger}) => {
    const expressConfiguration = () => {
        return new Promise((resolve) => {
            const app = express();

            // body-parser extracts the entire body portion of an incoming request stream and exposes it
            // on req.body as something easier to interface with.
            app.use(bodyParser.json({}));

            app.use((req, res, next) => {
                req.startTime = new Date(); // eslint-disable-line no-param-reassign

                req.context = { // eslint-disable-line no-param-reassign
                    appName: serverName,
                    requestId: uuid.v4(), // Generates a universally unique identifier (UUID)
                    initializer: {
                        path: req.path, // Contains the path part of the request URL.
                        method: req.method, //  GET/ POST/ PUT/ and so on.
                    },
                    input: {},
                };

                if (!_.isEmpty(req.params)) _.extend(req.context.input, req.params);
                if (!_.isEmpty(req.query)) _.extend(req.context.input, req.query);
                if (!_.isEmpty(req.body)) _.extend(req.context.input, req.body);
                logger.info('request started', req.context);
                next();
            });

            app.use((req, res, next) => {
                const oldWrite = res.write,
                    oldEnd = res.end;
                const chunks = [];

                // todo should be an arrow function?
                // override the write function to write in chunks
                res.write = function (chunk) { // eslint-disable-line no-param-reassign
                    chunks.push(chunk);

                    oldWrite.apply(res, arguments);
                };

                // must be a function not arrow function due to the use of arguments keyword
                res.end = function (chunk) {
                    if (chunk) {
                        chunks.push(new Buffer(chunk));
                    }

                    let body = Buffer.concat(chunks).toString('utf8');
                    if (body.length <= 4000) { // 4K hard limiting on response
                        if (res.get('Content-Type') && res.get('Content-Type').indexOf('application/json') > -1) body = JSON.parse(body);

                        req.context.response = body; // eslint-disable-line no-param-reassign
                    }
                    req.context.status = res.statusCode; // eslint-disable-line no-param-reassign
                    req.context.rt = (new Date() - req.startTime); // eslint-disable-line no-param-reassign

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
            const server = http.createServer(app);

            process.on('SIGINT', () => {
                logger.info(`-------- ${serverName} - start responding status not ok ------`);

                setTimeout(() => {
                    logger.info(`-------- Stopping ${serverName} Node ------`);
                    logger.info(`stopping pid: ${process.pid} ...`);
                    server.close(() => {
                        logger.info(`${process.pid} closed HTTP incoming connections`);
                    });
                }, timeToLeaveLoadBalancer);
            });

            // read controllers paths
            _.each(fs.readdirSync(controllersPath), (controller) => {
                require(path.join(controllersPath, controller))(app);// eslint-disable-line global-require
            });

            // error handling
            app.use((err, req, res, next) => {
                if (res.headersSent) {
                    return next(err);
                }

                logger.error(`Url: ${req.url}\nMethod: ${req.method}\nError: ${err.message}\nStack: ${err.stack}`);
                res.status(500).send('Unexpected Error, go to the log for more details...');

                next();
            });

            server.listen(httpPort);

            logger.info(`-------- Starting ${serverName} Node ------`);
            logger.info(`Listening on port ${httpPort}`);
            logger.info(`pid: ${process.pid}`);

            resolve(app);
        });
    };

    // exit handler (SIGINT)
    process.on('exit', (code) => {
        logger.error('Server is about to exit with code:', code);
    });

    // uncaughtException handler
    process.on('uncaughtException', (err) => {
        logger.error(`Server had an Uncaught exception\nError: ${err.message}\nStack:${err.stack}`);
    });

    return Promise.resolve()
        .then(expressConfiguration)
        .then(serverLaunch)
        .catch((err) => {
            logger.error(`Error: ${err.message}\nStack:${err.stack}`);
        });
};

module.exports = {
    initServer,
};
