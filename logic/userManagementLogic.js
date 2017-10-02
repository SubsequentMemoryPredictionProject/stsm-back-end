const moment = require('moment');
const _ = require('lodash');

const databaseUtils = require('./../utils/databaseUtils');

const createNewUser = (userName, password) => {
    const nowDate = moment().format('YYYY-MM-DD HH:mm:ss');
    const sqlQuery = `INSERT INTO users (user_name, password, created)
    VALUES ('${userName}', '${password}', '${nowDate}')`;

    return databaseUtils.executeQuery(sqlQuery)
        .then(() => {
            return {success: true};
        })
        .catch((err) => {
            if (err.errorCode === 'ER_DUP_ENTRY') {
                return {success: false, reason: 'The user already exists'};
            }
        });
};

const authenticateUser = (userName, password) => {
    const sqlQuery = `SELECT password, user_id FROM users WHERE user_name = '${userName}'`;

    return databaseUtils.executeQuery(sqlQuery)
        .then((response) => {
            if (_.isEmpty(response)) {
                return {success: false, reason: 'The user does not exist'};
            }

            const dbPassword = _.get(response, '[0].password');
            const userId = _.get(response, '[0].user_id');

            if (password && password === dbPassword) {
                return {success: true, id: userId};
            } else if (password) {
                return {success: false, reason: 'Invalid password'};
            }
            return {success: false};
        });
};

module.exports = {
    createNewUser,
    authenticateUser,
};
