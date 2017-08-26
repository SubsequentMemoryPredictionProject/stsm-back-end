const userManagementLogic = require('../logic/userManagementLogic');
const {config, logger} = require('./../index').getInitParams();

module.exports = (app) => {
    app.put('/stsm/user_management/create_user', (req, res) => {
        const userName = req.query.user_name;
        const password = req.query.password;

        return Promise.resolve()
            .then(() => userManagementLogic.createNewUser(userName, password))
            .then((response) => {
                if (response.success) {
                    logger.info(`User ${userName} was created successfully`);
                    res.json({msg: 'The user was created successfully', success: true});
                } else if (response.reason) {
                    logger.warn(`User ${userName} was not created due to ${response.reason}`);
                    res.json({msg: response.reason, success: false});
                } else {
                    logger.error(`User ${userName} was not created due to an unknown error`);
                    res.json({msg: 'User creation failed due to an unknown reason', success: false});
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
                    logger.info(`User ${userName} was authenticated successfully`);
                    res.json({msg: 'The user and password are valid', success: true});
                } else if (response.reason) {
                    logger.warn(`User ${userName} was not authenticated due to ${response.reason}`);
                    res.json({msg: response.reason, success: false});
                } else {
                    logger.error(`User ${userName} was not authenticated due to an unknown reason`);
                    res.json({msg: 'User creation failed due to an unknown reason', success: false});
                }
            });
    });
};
