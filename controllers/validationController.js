const request = require('request-promise');
const fs = require('fs');

const predictionLogic = require('../logic/predictionAndValidationLogic');
const errorUtils = require('../utils/errorUtils');
const csvErrors = require('../errors/csvErrors');

const {config, logger} = require('./../index').getInitParams();

module.exports = (app) => {
    app.post('/stsm/validation/start_validation_process', (req, res) => {
        const userId = req.query.user_id;
        if (!userId) {
            logger.info('The validation request failed since it does not contain a user id');
            res.json({msg: 'User id is missing', success: false});
            return;
        }

        const subjectsAndWordIdsForValidation = {};

        return predictionLogic.uploadReceivedFilesToTheDB(
            req,
            userId,
            predictionLogic.uploadValidationSampleSectionToDB,
            subjectsAndWordIdsForValidation
        ).then(() => {
            logger.info('All of the user\'s data was uploaded to the DB');
            logger.info('Sending validation request to the algorithms server');

            const algorithmsValidationUrl = `http://${config.algorithms_server}/stsm/algorithms/validate`;
            const requestBody = {
                user_id: userId,
                subjects_and_word_ids: subjectsAndWordIdsForValidation,
            };

            const requestOptions = {
                method: 'GET',
                body: requestBody,
                url: algorithmsValidationUrl,
                json: true, // Automatically stringifies the body to JSON
            };

            return request(requestOptions);
        })
            .then((validationResponse) => {
                const errorHandler = (err) => {
                    if (err) {
                        throw errorUtils.generate(csvErrors.writeCsvToFileFailure(err));
                    }
                };

                const validationScoresCsv = validationResponse;
                const validationScoresCsvPath = `${config.paths.output_folder}/user${userId}ValidationScores.csv`;
                return fs.writeFile(validationScoresCsvPath, validationScoresCsv, errorHandler);
            })
            .then(() => {
                logger.info('The validation process was successfully over, the scores csv is ready');
                res.json({msg: 'The validation process was successfully over!', success: true});
            })
            .catch((err) => {
                const errorMeg = `Validation process failed: ${err.message}`;
                res.json({msg: errorMeg, success: false});
                throw errorUtils.generate({message: errorMeg});
            });
    });

    app.get('/stsm/prediction/get_validation_scores', (req, res) => {
        const userId = req.query.user_id;
        if (!userId) {
            logger.info('The validation request failed since it does not contain a user id');
            res.json({msg: 'User id is missing', success: false});
            return;
        }

        logger.info('Sending the validation scores file to the user');

        const validationScoresCsvPath = `${config.paths.output_folder}/user${userId}ValidationScores.csv`;
        return res.sendFile(validationScoresCsvPath);
    });
};
