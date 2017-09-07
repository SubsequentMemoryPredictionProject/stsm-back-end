const Promise = require('bluebird');
const _ = require('lodash');

const learningLogic = require('../logic/learningLogic');

module.exports = (app) => {
    /* on a post request to /stsm/create_data_set
     // the server will extract a data set (training & testing)
     // from the raw csv files.
     // the EEG signal was pre-processed in advanced using Matlab
     */
    app.post('/stsm/create_data_set', (req, res) => {
        const subjectIds = _.range(1, 23);
        const subjectHandler = (subjectId) => learningLogic.uploadSubjectData(subjectId);

        return Promise.each(subjectIds, subjectHandler)
            .then(() => {
                res.json({msg: 'The data set was loaded to the db', success: true});
            });
    });
};
