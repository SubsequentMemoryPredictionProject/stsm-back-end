const {config, logger} = require('./../index').getInitParams();

module.exports = (app) => {
    // TODO test remove
    // responds to http get requests to  http://myip:3101/stsm/test
    app.get('/stsm/test', (req, res) => {
        res.json({msg: 'ok'});
    });
};
