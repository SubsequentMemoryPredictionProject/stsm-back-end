const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const _ = require('lodash');
const uuid = require('node-uuid');
const cors = require('cors');
const http = require('http');

const expressConfiguration = (app, serverName, logger) => {
    return new Promise((resolve) => {
        app.use(bodyParser.json({})); // body-parser extracts the body of a request and exposes it on req.body
        app.use(cors());

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

            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            res.header('Access-Control-Allow-Methods', '*');
            res.header('Access-Control-Allow-Origin', '*');

            if (!_.isEmpty(req.params)) _.extend(req.context.input, req.params);
            if (!_.isEmpty(req.query)) _.extend(req.context.input, req.query);
            if (!_.isEmpty(req.body)) _.extend(req.context.input, req.body);

            logger.info('HTTP request received', req.context);

            next();
        });

        app.use((req, res, next) => {
            const oldWrite = res.write,
                oldEnd = res.end;
            const chunks = [];

            // must be a function not arrow function due to the use of arguments keyword
            // override the write function to write in chunks
            res.write = function (chunk) { // eslint-disable-line no-param-reassign, func-names
                chunks.push(chunk);

                oldWrite.apply(res, arguments);
            };

            // must be a function not arrow function due to the use of arguments keyword
            res.end = function (chunk) {  // eslint-disable-line no-param-reassign, func-names
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

                logger.info('request finished!', req.context);

                oldEnd.apply(res, arguments);
            };

            next();
        });

        resolve(app);
    });
};

const serverLaunch = (app, logger, serverName, timeToLeaveLoadBalancer, controllersPath, httpPort) => {
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

const initServer = ({serverName, httpPort, controllersPath, timeToLeaveLoadBalancer, logger}) => {
    // Exit handler (SIGINT)
    process.on('exit', (code) => {
        logger.error('Server is about to exit with code:', code);
    });

    // Uncaught exception handler
    process.on('uncaughtException', (err) => {
        logger.error(`Server had an Uncaught exception\nError: ${err.message}\nStack:${err.stack}`);
    });

    const app = express();

    return Promise.resolve()
        .then(() => expressConfiguration(app, serverName, logger))
        .then(() => serverLaunch(app, logger, serverName, timeToLeaveLoadBalancer, controllersPath, httpPort))
        .catch((err) => {
            logger.error(`Error: ${err.message}\nStack:${err.stack}`);
        });
};

module.exports = {
    initServer,
};
