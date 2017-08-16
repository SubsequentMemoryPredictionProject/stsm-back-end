const _ = require('lodash');
const winston = require('winston');
const colors = require('colors');

colors.enabled = true;

const createLogger = (loggerConfig) => {
    const transports = _.map(loggerConfig.transports, (transportConfig) => {
        const transportOptions = _.extend({
            timestamp: true,
            prettyPrint: true,
            colorize: true,
        }, transportConfig.options);

        return new winston.transports[transportConfig.type](transportOptions);
    });

    return new winston.Logger({
        transports,
        exceptionHandlers: transports,
        colorize: true,
    });
};

module.exports = {
    createLogger,
};
