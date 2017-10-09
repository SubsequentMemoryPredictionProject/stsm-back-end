const Promise = require('bluebird');
const fs = require('fs');
const _ = require('lodash');

const learningLogic = require('../logic/learningLogic');
const csvUtils = require('../utils/csvUtils');
const errorUtils = require('../utils/errorUtils');
const predictionNames = require('../enums/predictionNames');
const featureArraysNames = require('../enums/featureArraysNames');
const sampleIdNames = require('../enums/sampleIdNames');
const csvErrors = require('../errors/csvErrors');

const {config, logger} = require('./../index').getInitParams();

const PREDICTION_CSV_PATH = `${config.paths.output_folder}/predictionSet.csv`;
const VALIDATION_CSV_PATH = `${config.paths.output_folder}/validationSet.csv`;

module.exports = (app) => {
    app.post('/stsm/learning/training_and_validation_set_creation', (req, res) => {
        const subjectIds = _.range(1, config.subjects_count + 1);
        const validationSetIndexes = [];
        let i = 0;

        for (; i < config.validation_set_size; i++) {
            const currSubjectId = _.random(1, config.subjects_count + 1);
            const currWordId = _.random(1, config.words_per_subject + 1);
            const sampleKey = `${currSubjectId}%${currWordId}`;
            if (validationSetIndexes.indexOf(sampleKey) === -1) {
                validationSetIndexes.push(sampleKey);
            } else {
                --i;
            }
        }

        logger.info(`The validation set will include ${_.size(validationSetIndexes)} samples`);

        const validationData = [];
        const subjectHandler = (subjectId) => {
            return learningLogic.uploadSubjectData(subjectId, validationSetIndexes, validationData);
        };

        return learningLogic.truncateDataSet()
            .then(() => Promise.each(subjectIds, subjectHandler))
            .then(() => {
                logger.info('The training set was uploaded to the DB');

                const relevantSampleIdNames = _.values(sampleIdNames).slice(1, 3);
                const electrodeColumnsNames = featureArraysNames.electrodeColumnsNames;
                const predictionCsvFieldNames = relevantSampleIdNames.concat(electrodeColumnsNames);
                const validationCsvFieldNames = relevantSampleIdNames.concat(_.values(predictionNames), electrodeColumnsNames);

                return Promise.all([
                    csvUtils.convertJsonToCsv(predictionCsvFieldNames, {items: validationData}),
                    csvUtils.convertJsonToCsv(validationCsvFieldNames, {items: validationData}),
                ]);
            })
            .then(([predictionCsv, validationCsv]) => {
                const errorHandler = (err) => {
                    if (err) {
                        throw errorUtils.generate(csvErrors.writeCsvToFileFailure(err));
                    }
                };

                return Promise.all([
                    fs.writeFile(PREDICTION_CSV_PATH, predictionCsv, errorHandler),
                    fs.writeFile(VALIDATION_CSV_PATH, validationCsv, errorHandler),
                ]);
            })
            .then(() => {
                logger.info('The validation set was created');
                res.json({msg: 'Training and validation sets were created successfully', success: true});
            });
    });
};
