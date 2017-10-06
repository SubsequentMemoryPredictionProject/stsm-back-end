const _ = require('lodash');
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

module.exports = (app) => {
    app.post('/stsm/prediction/start_prediction_process', (req, res) => {
        const userId = req.query.user_id;
        if (!userId) {
            logger.info('The prediction request failed since it does not contain a user id');
            res.json({msg: 'User id is missing', success: false});
            return;
        }

        const subjectsAndWordIdsForPrediction = {};

        return predictionLogic.uploadReceivedFilesToTheDB(
            req,
            userId,
            predictionLogic.uploadPredictionSampleSectionToDB,
            subjectsAndWordIdsForPrediction
        ).then(() => {
            logger.info('All of the user\'s data was uploaded to the DB');
            logger.info('Sending prediction request to the algorithms server');

            const algorithmsPredictionUrl = `http://${config.algorithms_server}/stsm/algorithms/predict`;
            const requestBody = {
                user_id: userId,
                subjects_and_word_ids: subjectsAndWordIdsForPrediction,
            };

            const requestOptions = {
                method: 'POST',
                body: requestBody,
                url: algorithmsPredictionUrl,
                json: true, //Automatically stringifies the body to JSON
            };

            return request(requestOptions);
        })
            .then((predictionsResponse) => {
                logger.info(`Algorithms server response was: ${predictionsResponse.msg}`);

                if (!predictionsResponse.success) {
                    throw errorUtils.generate(httpErrors.algorithmsServerPredictionFailure(predictionsResponse.msg));
                }

                const addSubjectToQuery = (queryANDString, subjectWords, subjectId) => {
                    return `${queryANDString} (subject_id = ${subjectId} AND word_id in (${subjectWords})) OR `;
                };
                const queryANDPart = _.reduce(subjectsAndWordIdsForPrediction, addSubjectToQuery, '');

                const predictionQuery = `SELECT * FROM untagged_predictions WHERE user_id=${userId} AND ${queryANDPart.slice(0, -3)}`;
                return databaseUtils.executeQuery(predictionQuery);
            })
            .then((sqlResponse) => {
                const releventSampleIdNamedForCsv = _.values(sampleIdNames).slice(1);
                const resultsCsvFiledNames = releventSampleIdNamedForCsv.concat(_.values(predictionNames));

                logger.info('Creating a csv file with the predictions');
                return csvUtils.convertJsonToCsv(resultsCsvFiledNames, {items: sqlResponse});
            })
            .then((resultsCsv) => {
                const errorHandler = (err) => {
                    if (err) {
                        throw errorUtils.generate(csvErrors.writeCsvToFileFailure(err));
                    }
                };

                const resultsCsvPath = `${config.paths.output_folder}/user${userId}PredictionResults.csv`;
                return fs.writeFile(resultsCsvPath, resultsCsv, errorHandler);
            })
            .then(() => {
                logger.info('The prediction process was successfully over, the results csv is ready');
                res.json({msg: 'The prediction process was successfully over!', success: true});
            })
            .catch((err) => {
                const errorMeg = `Prediction process failed: ${err.message}`;
                res.json({msg: errorMeg, success: false});
                throw errorUtils.generate({message: errorMeg});
            });
    });

    app.get('/stsm/prediction/get_predictions', (req, res) => {
        const userId = req.query.user_id;
        if (!userId) {
            logger.info('The prediction request failed since it does not contain a user id');
            res.json({msg: 'User id is missing', success: false});
            return;
        }

        logger.info('Sending the results file to the user');

        const resultsCsvPath = `${config.paths.output_folder}/user${userId}PredictionResults.csv`;
        return res.sendFile(resultsCsvPath);
    });
};
