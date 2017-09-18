const Promise = require('bluebird');
const _ = require('lodash');

const learningLogic = require('../logic/learningLogic');
const databaseUtils = require('../utils/databaseUtils');


module.exports = (app) => {
    /* on a post request to /stsm/create_data_set
     // the server will extract a data set (training & testing)
     // from the raw csv files.
     // the EEG signal was pre-processed in advanced using Matlab
     */
    app.post('/stsm/learning/upload_data_set', (req, res) => {
        const subjectIds = _.range(1, 23);
        const subjectHandler = (subjectId) => learningLogic.uploadSubjectData(subjectId);

        return Promise.each(subjectIds, subjectHandler)
            .then(() => {
                res.json({msg: 'The data set was loaded to the db', success: true});
            });
    });

    app.post('/stsm/learning/create_validation_test', (req, res) => {
        const query = `SELECT signal_elec1_subelec1, signal_elec1_subelec2,
        signal_elec1_subelec3, signal_elec2_subelec1, signal_elec2_subelec2,
         signal_elec2_subelec3 from data_set WHERE EEG_data_section=1`

        return databaseUtils.executeQuery(query)
            .then(() => {
                console.log('did it!');
                res.json({msg: 'Did it', success: true});
            }).catch(console.log);
    });
};
