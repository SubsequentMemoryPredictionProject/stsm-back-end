const mysql = require('promise-mysql');

const errors = require('./../errors/dbErrors');
const errorUtils = require('./../utils/errorUtils');

let logger;
let connection;

const init = (initParams) => {
    const dbConfig = initParams.config.amazon_rds;
    logger = initParams.logger;

    return Promise.resolve()
        .then(() => mysql.createConnection(dbConfig))
        .then((conn) => {
            connection = conn;
            logger.info('Connection to the DB was successfully established');
        })
        .catch((err) => {
            throw errorUtils.generate(errors.dbConnectionFailure(err));
        });
};

const exitHandler = () => {
    logger.info('Closing the database connection gracefully');

    if (connection) {
        return connection.end((err) => {
            throw errorUtils.generate(errors.dbConnectionTerminationFailure(err));
        });
    }
};

const executeQuery = (query) => {
    return new Promise((resolve, reject) => {
        logger.info(`Performing sql query: ${query.substring(0, 125)}`);

        connection.query(query, (error, results) => {
            if (error) {
                reject(errorUtils.generate(errors.dbQueryFailure(error)));
            }
            resolve(results);
        });
    });
};

module.exports = {
    init,
    executeQuery,
    exitHandler,
};
