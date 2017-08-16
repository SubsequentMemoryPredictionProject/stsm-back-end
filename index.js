const path = require('path');
const serverInfrastructure = require('./utils/serverInfraUtils');
const config = require('./config');
const loggerUtils = require('./utils/loggerUtils');

let logger;

(() => {
    logger = loggerUtils.createLogger(config.logger);

    serverInfrastructure.initServer({
        serverName: 'STSM-Service',
        httpPort: config.httpPort, // TODO change ports
        controllersPath: path.join(__dirname, 'controllers'),
        timeToLeaveLoadBalancer: 1000 * 20,
        logger,
    });
})();

const getInitParams = () => {
    return {config, logger};
};

module.exports = {
    getInitParams,
};
