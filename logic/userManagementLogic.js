const moment = require('moment');
const _ = require('lodash');
const databaseUtils = require('./../utils/databaseUtils');

let logger;

const init = (initParams) => {
    logger = initParams.logger;
};

const createNewUser = (userName, password) => {
    const nowDate = moment().format('YYYY-MM-DD HH:mm:ss');
    const sqlQuery = `INSERT INTO users (user_name, password, created)
    VALUES ('${userName}', '${password}', '${nowDate}')`;
    return databaseUtils.executeQuery(sqlQuery)
        .then(() => {
            logger.info(`The user "${userName}" was created successfully`);
            return {success: true};
        })
        .catch((err) => {
            if (err.errorCode === 'ER_DUP_ENTRY') {
                logger.warn(`The user "${userName}" already exists`);
                return {success: false, reason: 'The user already exists'};
            }
            logger.error(`The user "${userName}" was not created`);
        });
};

const authenticateUser = (userName, password) => {
    const sqlQuery = `SELECT password, user_id FROM users WHERE user_name = '${userName}'`;
    return databaseUtils.executeQuery(sqlQuery)
        .then((response) => {
            if (_.isEmpty(response)) {
                logger.info('The user does not exist');
                return {success: false, reason: 'invalid user'};
            }
            const dbPassword = _.get(response, '[0].password');
            const userId = _.get(response, '[0].user_id');
            if (password && password === dbPassword) {
                logger.info(`The user "${userName}" was authenticated successfully`);
                return {success: true, id: userId};
            } else if (password) {
                logger.warn(`The user "${userName}" was not authenticated successfully due to an invalid password`);
                return {success: false, reason: 'Invalid password'};
            }
            logger.warn(`The user "${userName}" was not authenticated due to an unknown error`);
            return {success: false};
        });
};

module.exports = {
    init,
    createNewUser,
    authenticateUser,
};
