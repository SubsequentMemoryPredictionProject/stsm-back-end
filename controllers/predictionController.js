const _ = require('lodash');
const Promise = require('bluebird');
const request = require('request-promise');
const fs = require('fs');

const predictionLogic = require('../logic/predictionAndValidationLogic');
const csvUtils = require('../utils/csvUtils');
const errorUtils = require('../utils/errorUtils');
const databaseUtils = require('../utils/databaseUtils');
const predictionNames = require('../enums/predictionNames');
const sampleIdNames = require('../enums/sampleIdNames');
const csvErrors = require('../errors/csvErrors');
const httpErrors = require('../errors/httpErrors');

const {config, logger} = require('./../index').getInitParams();

const RESULTS_CSV_PATH = `${config.paths.output_folder}/predictionResults.csv`;

module.exports = (app) => {
    app.post('/stsm/predict', (req, res) => {
        const userId = req.query.user_id;

        if (!userId) {
            logger.error('no id');
            // TODO handel
        }

        const subjectsAndWordIdsForPrediction = {};

        return predictionLogic.fromHttpFormToFileArray(req)
            .then((fileArray) => {
                const sampleHandler = predictionLogic.createSampleHandler(
                    predictionLogic.uploadSampleSectionToDB,
                    userId,
                    subjectsAndWordIdsForPrediction
                );

                return Promise.each(fileArray, (file) => {
                    logger.info(`A file named ${file.name} was uploaded by user id ${userId}`);
                    return csvUtils.each(file.path, sampleHandler);
                });
            })
            .then(() => {
                logger.info('All of the user\'s data was uploaded to the DB');
                logger.info('Sending prediction request to the algorithms server');

                const url = `http://${config.algorithms_server}/stsm/algorithms/predict`;
                const requestBody = {
                    user_id: userId,
                    subjects_and_word_ids: subjectsAndWordIdsForPrediction,
                };


                const requestOptions = {
                    method: 'POST',
                    body: requestBody,
                    url,
                    json: true, //Automatically stringifies the body to JSON
                };

                const sqlQuery = 'select count(*) from user_data';

                return databaseUtils.executeQuery(sqlQuery)

                // return request(requestOptions);
            })
            .then((predictionsResponse) => {
                logger.info(`Algorithms server response was: ${predictionsResponse.msg}`);

                if (!predictionsResponse.success) {
                    throw errorUtils.generate(httpErrors.algorithmsServerPredictionFailure(err.msg));
                }

                const subjectHandler = (queryANDString, subjectWords, subjectId) => {
                    return `${queryANDString} (subject_id = ${subjectId} AND word_id in (${subjectWords})) OR `;
                };
                const queryANDPart = _.reduce(subjectsAndWordIdsForPrediction, subjectHandler, '');
                const predictionQuery = `SELECT * FROM untagged_predictions WHERE user_id=${userId} AND ${queryANDPart.slice(0, -3)}`;
                return databaseUtils.executeQuery(predictionQuery);
            })
            .then((sqlResponse) => {
                const resultsCsvFiledNames = _.values(sampleIdNames).slice(1).concat(_.values(predictionNames));
                logger.info('Creating a csv file with the predictions');
                return csvUtils.convertJsonToCsv(resultsCsvFiledNames, {items: sqlResponse});
            })
            .then((resultsCsv) => {
                // TODO here
                const errorHandler = (err) => {
                    if (err) {
                        throw errorUtils.generate(csvErrors.writeCsvToFileFailure(err));
                    }
                };

                return fs.writeFile(RESULTS_CSV_PATH, resultsCsv, errorHandler);
            })
            .then(() => {
                logger.info('Sending the results csv file to the user');
                res.sendFile(RESULTS_CSV_PATH);
            })
            .catch((err) => {
                // todo
                logger.error(`Prediction process failed: ${err.message}`);
            });
    });
};
