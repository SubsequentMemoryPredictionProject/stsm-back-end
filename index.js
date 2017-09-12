'use strict';

const path = require('path');
const Promise = require('bluebird');
const config = require('./config');
const serverInfrastructure = require('./utils/serverInfraUtils');
const loggerUtils = require('./utils/loggerUtils');
const databaseUtils = require('./utils/databaseUtils');
const userManagementLogic = require('./logic/userManagementLogic');
const learningLogic = require('./logic/learningLogic');

let logger;

// in case of exit, close the connection to the database
process.on('SIGINT', () => {
    return databaseUtils.exitHandler();
});

process.on('exit', () => {
    return databaseUtils.exitHandler();
});

// Main function
(() => {
    logger = loggerUtils.createLogger(config.logger);

    return Promise.all([
        databaseUtils.init({config, logger}),
        userManagementLogic.init({config, logger}),
        learningLogic.init({config, logger}),
    ]).then(() => {
        return serverInfrastructure.initServer({
            serverName: 'STSM-Server',
            httpPort: config.httpPort,
            controllersPath: path.join(__dirname, 'controllers'),
            timeToLeaveLoadBalancer: 1000 * 20,
            logger,
        });
    });
})();

const getInitParams = () => {
    return {config, logger};
};

module.exports = {
    getInitParams,
};
