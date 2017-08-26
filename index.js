const path = require('path');
const Promise = require('bluebird');
const serverInfrastructure = require('./utils/serverInfraUtils');
const config = require('./config');
const loggerUtils = require('./utils/loggerUtils');
const databaseUtils = require('./utils/databaseUtils');
const userManagementLogic = require('./logic/userManagementLogic');

let logger;

// in case of exit, close the connection to the database
process.on('SIGINT', () => {
    return databaseUtils.exitHandler();
});

process.on('exit', () => {
    return databaseUtils.exitHandler();
});


(() => {
    logger = loggerUtils.createLogger(config.logger);

    return Promise.all([
        databaseUtils.init({config, logger}),
        userManagementLogic.init({config, logger}),
    ]).then(() => {
        // todo retrun?
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
