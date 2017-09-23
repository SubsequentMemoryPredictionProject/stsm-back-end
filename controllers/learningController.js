const Promise = require('bluebird');
const _ = require('lodash');
const {config} = require('./../index').getInitParams();

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

        const validationSetIndexes = [];
        let i = 0;
        for (; i < config.validation_set_size; i++) {
            const subjectId = _.random(1, 23);
            const wordId = _.random(1, 401);
            const sampleIndex = [subjectId, wordId];
            if (!_.includes(validationSetIndexes, sampleIndex)) {
                validationSetIndexes.push(sampleIndex);
            } else {
                i--;
            }
        }

        const subjectHandler = (subjectId) => learningLogic.uploadSubjectData(subjectId, validationSetIndexes);

        return Promise.each(subjectIds, subjectHandler)
            .then(() => {
                res.json({msg: 'The data set was loaded to the db', success: true});
            });
    });
};
