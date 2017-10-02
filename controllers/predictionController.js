const _ = require('lodash');
const Promise = require('bluebird');
const formidable = require('formidable');
const request = require('request');

const predictionNames = require('../enums/predictionNames');
const predictionLogic = require('../logic/predictionLogic');
const csvUtils = require('../utils/csvUtils');
const errorUtils = require('../utils/errorUtils');
const databaseUtils = require('../utils/databaseUtils');
const httpErrors = require('../errors/httpErrors');

const {config, logger} = require('./../index').getInitParams();

module.exports = (app) => {
    app.post('/stsm/predict', (req, res) => {
        const userId = req.query.user_id;
        const form = new formidable.IncomingForm();
        const subjectsAndWordIdsForPrediction = {};

        return Promise.resolve()
            .then(() => {
                return form.parse(req, (err, fields, files) => {
                    if (err) {
                        throw errorUtils.generate(httpErrors.formParsingFailure(err));
                    }
                    const fileArray = predictionLogic.fromFilesToFileArray(files);

                    let firstCall = 1;
                    const sampleHandler = (sample) => {
                        // TODO handel
                        if (firstCall) {
                            firstCall = 0;
                            return;
                        }
                        const subjectId = sample[0];
                        const wordId = sample[1];

                        if (_.isUndefined(subjectsAndWordIdsForPrediction[subjectId])) {
                            subjectsAndWordIdsForPrediction[subjectId] = [];
                        }
                        subjectsAndWordIdsForPrediction[subjectId].push(wordId);

                        return Promise.all([
                            predictionLogic.uploadSampleSectionToDB(sample, 1, userId),
                            predictionLogic.uploadSampleSectionToDB(sample, 2, userId),
                        ]);
                    };

                    return Promise.each(fileArray, (file) => {
                        logger.info(`A file named ${file.name} was uploaded by user id ${userId}`);
                        return csvUtils.each(file.path, sampleHandler);
                    });
                });
            })
            .then(() => {
                logger.info('All user data was uploaded to the DB');
                logger.info('Sending prediction request to the algorithms server');

                const requestOptions = {
                    uri: `http://${config.algorithms_server}/stsm/algorithms/predict`,
                    json: true, // Automatically parses the JSON string in the response
                };

                return request(requestOptions, (error, response, body) => {
                    if (error) {
                        console.log('gal', error)
                        throw errorUtils.generate(httpErrors.algorithmsServerConnectionFailure());
                    }
                    const responseBody = JSON.parse(body);
                    if (_.get(responseBody, 'error') || responseBody.success === false) {
                        throw errorUtils.generate(httpErrors.algorithmsServerPredictionFailure());
                    }
                    logger.info('Prediction process was successfully done by the algorithms server');

                    return body;
                });

            }).then((resp) => {
                console.log('gal', JSON.stringify(resp))
                const columnNames = _.values(predictionNames);
                const subjectHandler = (queryANDString, subjectWords, subjectId) => {
                    return `${queryANDString} 
                (subject_id = ${subjectId}, word_id in [${subjectWords})] OR`;
                };
                const queryANDPart = _.reduce(subjectsAndWordIdsForPrediction, subjectHandler, '');

                const predictionQuery = `SELECT ${columnNames.toString()}
                            FROM untagged_predictions
                            WHERE user_id=${userId}
                            AND ${queryANDPart.slice(0, -3)}`;

                return databaseUtils.executeQuery(predictionQuery);
            })
            .then((predictionsResponse) => {
                console.log(predictionsResponse);
                res.sendFile(`${config.paths.output_folder}/results.csv`);
            });
    });
};
