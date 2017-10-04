const _ = require('lodash');
const Promise = require('bluebird');
const formidable = require('formidable');
const request = require('request-promise');

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

        return new Promise((resolve) => {
            logger.info('Formidable is parsing the received form');
            form.parse(req, (err, fields, files) => {
                if (err) {
                    throw errorUtils.generate(httpErrors.formParsingFailure(err));
                }
                const fileArray = predictionLogic.fromFilesToFileArray(files);
                resolve(fileArray);
            });
        })
            .then((fileArray) => {
                let firstCall = 1;
                const sampleHandler = (sample) => {
                    console.log('inside sample handle', subjectsAndWordIdsForPrediction);
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
                    // console.log('subjectId', subjectId, typeof(subjectId))
                    // console.log('subjectId', wordId, typeof(wordId))
                    //
                    // if(subjectsAndWordIdsForPrediction[subjectId])
                    // _.set(subjectsAndWordIdsForPrediction, `${subjectId}.${wordId}`, wordId);


                    return Promise.all([
                        predictionLogic.uploadSampleSectionToDB(sample, 1, userId),
                        predictionLogic.uploadSampleSectionToDB(sample, 2, userId),
                    ]);
                };
                return Promise.each(fileArray, (file) => {
                    logger.info(`A file named ${file.name} was uploaded by user id ${userId}`);
                    return csvUtils.each(file.path, sampleHandler);
                });
            })
            .then(() => {
                logger.info(`All of the data uploaded by user id ${userId} was sent to the DB`);
                logger.info('Sending prediction request to the algorithms server');

                const url = `http://${config.algorithms_server}/stsm/algorithms/predict`;

                console.log('subjectsAndWordIdsForPrediction', subjectsAndWordIdsForPrediction)                // const requestBody = {subjects_and_word_ids: subjectsAndWordIdsForPrediction};
                const requestBody = {subjects_and_word_ids: subjectsAndWordIdsForPrediction};

                console.log('JSON.stringify(requestBody)', JSON.stringify(requestBody))                // const requestBody = {subjects_and_word_ids: subjectsAndWordIdsForPrediction};

                console.log('JSON.stringify(subjectsAndWordIdsForPrediction)', JSON.stringify(subjectsAndWordIdsForPrediction))                // const requestBody = {subjects_and_word_ids: subjectsAndWordIdsForPrediction};

                const requestOptions = {
                    method: 'POST',
                    body: requestBody,
                    url,
                    json: true, //Automatically stringifies the body to JSON
                    // headers: {
                    //     "content-type": "application/json",
                    // },
                };


                return request(requestOptions);
            })
            .then((predictionsResponse) => {
                console.log('predictionsResponse', predictionsResponse);

                const columnNames = _.values(predictionNames);
                const subjectHandler = (queryANDString, subjectWords, subjectId) => {
                    return `
                ${queryANDString}
                    (subject_id = ${subjectId}, word_id in [${subjectWords})] OR`;
                };
                const queryANDPart = _.reduce(subjectsAndWordIdsForPrediction, subjectHandler, '');

                const predictionQuery = `SELECT ${columnNames.toString()}
                                FROM untagged_predictions
                                WHERE user_id=${userId}
                                AND ${queryANDPart.slice(0, -3)}`;

                return databaseUtils.executeQuery(predictionQuery);
            })
            .then(() => {
                res.sendFile(`${config.paths.output_folder}/results.csv`);
            })
            .catch(console.log);
    });
};
