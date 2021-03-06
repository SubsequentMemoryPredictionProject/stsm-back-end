const path = require('path');
const Promise = require('bluebird');

const config = require('./config');
const serverInfrastructure = require('./utils/serverInfraUtils');
const loggerUtils = require('./utils/loggerUtils');
const databaseUtils = require('./utils/databaseUtils');
const errorUtils = require('./utils/errorUtils');
const httpErrors = require('./errors/httpErrors');
const learningLogic = require('./logic/learningLogic');

let logger;

// Before exit make sure to close the connection to the DB
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
        learningLogic.init({config, logger}),
    ]).then(() => {
        return serverInfrastructure.initServer({
            serverName: 'STSM-Server',
            httpPort: config.server.port,
            controllersPath: path.join(__dirname, 'controllers'),
            timeToLeaveLoadBalancer: 1000 * 20,
            logger,
        });
    }).catch((err) => {
        throw errorUtils.generate(httpErrors.serverInitializationFailed(err.message));
    });
})();

const getInitParams = () => {
    return {config, logger};
};

module.exports = {
    getInitParams,
};
