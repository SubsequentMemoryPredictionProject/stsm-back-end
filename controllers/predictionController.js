const {config, logger} = require('./../index').getInitParams();

module.exports = (app) => {
    app.get('/stsm/test', (req, response) => {
        console.log(req)
        response.json({ok: true});
    });
};
