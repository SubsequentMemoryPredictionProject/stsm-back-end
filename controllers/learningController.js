const Promise = require('bluebird');
const fs = require('fs');
const _ = require('lodash');
const {config} = require('./../index').getInitParams();

const learningLogic = require('../logic/learningLogic');
const csvUtils = require('../utils/csvUtils');
const errorUtils = require('../utils/errorUtils');
const predictionNames = require('../enums/predictionNames');
const featureArraysNames = require('../enums/featureArraysNames');
const sampleIdNames = require('../enums/sampleIdNames');

const csvErrors = require('../errors/csvErrors');


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
            const sampleKey = `${subjectId}%${wordId}`;
            if (!_.includes(validationSetIndexes, sampleKey)) {
                validationSetIndexes.push(sampleKey);
            } else {
                i--;
            }
        }

        const validationData = [];
        const subjectHandler = (subjectId) => learningLogic.uploadSubjectData(subjectId, validationSetIndexes, validationData);

        return Promise.each(subjectIds, subjectHandler)
            .then(() => {
                const predictionCsvFieldNames = (_.values(sampleIdNames).slice(1, 3)).concat(featureArraysNames);
                const validationCsvFieldNames = (_.values(sampleIdNames).slice(1, 3)).concat(_.values(predictionNames), featureArraysNames);
                return Promise.all([
                    csvUtils.convertJsonToCsv(predictionCsvFieldNames, {items: validationData}),
                    csvUtils.convertJsonToCsv(validationCsvFieldNames, {items: validationData}),
                ]);
            })
            .then(([predictionCsv, validationCsv]) => {
                const predictionPath = `${config.output_folder}/predictionSet.csv`;
                const validationPath = `${config.output_folder}/validationSet.csv`;

                const errorHandler = (err) => {
                    if (err) {
                        throw errorUtils.generate(csvErrors.failureInWriteFile(err));
                    }
                };

                return Promise.all([
                    fs.writeFile(predictionPath, predictionCsv, errorHandler),
                    fs.writeFile(validationPath, validationCsv, errorHandler),
                ]);
            })
            .then(() => {
                res.json({msg: 'The data set was loaded to the db', success: true});
            });
    });
};
