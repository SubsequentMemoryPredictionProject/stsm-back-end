const userManagementLogic = require('../logic/userManagementLogic');

const {logger} = require('./../index').getInitParams();

module.exports = (app) => {
    app.put('/stsm/user_management/create_user', (req, res) => {
        const userName = req.query.user_name;
        const password = req.query.password;

        return Promise.resolve()
            .then(() => userManagementLogic.createNewUser(userName, password))
            .then((response) => {
                if (response.success) {
                    const successMsg = `User ${userName} was created successfully`;
                    logger.info(successMsg);
                    res.json({msg: successMsg, success: true});
                } else if (response.reason) {
                    const failedMsg = `User ${userName} was not created due to ${response.reason}`;
                    logger.warn(failedMsg);
                    res.json({msg: failedMsg, success: false});
                } else {
                    const unknownError = `User ${userName} was not created due to an unknown error`;
                    logger.error(unknownError);
                    res.json({msg: unknownError, success: false});
                }
            });
    });

    app.get('/stsm/user_management/authenticate', (req, res) => {
        const userName = req.query.user_name;
        const password = req.query.password;

        return Promise.resolve()
            .then(() => userManagementLogic.authenticateUser(userName, password))
            .then((response) => {
                if (response.success) {
                    const successMsg = `User ${userName} was authenticated successfully`;
                    logger.info(successMsg);
                    res.json({msg: successMsg, user_id: response.id, success: true});
                } else if (response.reason) {
                    const failedMsg = `User ${userName} was not authenticated due to ${response.reason}`;
                    logger.warn(failedMsg);
                    res.json({msg: failedMsg, success: false});
                } else {
                    const unknownError = `User ${userName} was not authenticated due to an unknown reason`;
                    logger.error(unknownError);
                    res.json({msg: unknownError, success: false});
                }
            });
    });
};
