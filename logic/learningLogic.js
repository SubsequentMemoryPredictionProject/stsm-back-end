const _ = require('lodash');
const Promise = require('bluebird');

const predictionNames = require('../enums/predictionNames');
const featureArraysNames = require('../enums/featureArraysNames');
const sampleIdNames = require('../enums/sampleIdNames');
const csvUtils = require('./../utils/csvUtils');
const databaseUtils = require('../utils/databaseUtils');

let logger, config;

const init = (initParams) => {
    logger = initParams.logger;
    config = initParams.config;
};

const truncateDataSet = () => {
    const truncateQuery = 'TRUNCATE data_set';

    return databaseUtils.executeQuery(truncateQuery);
};

const getSubjectDataFromRawData = (subjectId) => {
    const subjectData = {};
    const electrodeIds = [1, 2, 3, 4];
    const subElectrodeIds = [1, 2, 3];

    return Promise.resolve()
        .then(() => {
            const confidenceFile = `${config.paths.input_folder}/raw_data/Confidence_S${subjectId}.csv`;
            let wordId = 1;
            return csvUtils.each(confidenceFile, (wordConfidenceData) => {
                _.set(subjectData, `${wordId}.${predictionNames.STM_confidence_level}`, wordConfidenceData[0]);
                _.set(subjectData, `${wordId}.${predictionNames.LTM_confidence_level}`, wordConfidenceData[1]);
                wordId++;
            });
        })
        .then(() => {
            logger.info(`Finished loading confidence data for subject #${subjectId}`);

            const oldNewFile = `${config.paths.input_folder}/raw_data/OldNew_S${subjectId}.csv`;
            let wordId = 1;
            return csvUtils.each(oldNewFile, (oldNewData) => {
                _.set(subjectData, `${wordId}.${predictionNames.STM}`, oldNewData[0]);
                _.set(subjectData, `${wordId}.${predictionNames.LTM}`, oldNewData[1]);
                wordId++;
            });
        })
        .then(() => {
            logger.info(`Finished loading old/new data for subject #${subjectId}`);

            const rkFile = `${config.paths.input_folder}/raw_data/RK_S${subjectId}.csv`;
            let wordId = 1;
            return csvUtils.each(rkFile, (rkData) => {
                // in case the word was not remember, we'll save '4' instead of 'Nan'
                if (rkData[0] === 'NaN') {
                    rkData[0] = 4; // eslint-disable-line no-param-reassign
                }

                if (rkData[1] === 'NaN') {
                    rkData[1] = 4; // eslint-disable-line no-param-reassign
                }

                _.set(subjectData, `${wordId}.${predictionNames.STM_remember_know}`, rkData[0]);
                _.set(subjectData, `${wordId}.${predictionNames.LTM_remember_know}`, rkData[1]);
                wordId++;
            });
        })
        .then(() => {
            logger.info(`Finished loading remember/know data for subject #${subjectId}`);

            return Promise.each(electrodeIds, (elecId) => {
                return Promise.each(subElectrodeIds, (subElecId) => {
                    const sampleFile = `${config.paths.input_folder}/raw_data/Signal_S${subjectId}_Elec${elecId}_SubElec${subElecId}.csv`;
                    const sampleName = `signal_elec${elecId}_subelec${subElecId}`;
                    let wordId = 1;
                    return csvUtils.each(sampleFile, (eegData) => {
                        _.set(subjectData, `${wordId}.${sampleName}`, eegData);
                        wordId++;
                    });
                });
            });
        })
        .then(() => {
            logger.info(`Finished loading EEG data for subject #${subjectId}`);

            return subjectData;
        });
};

const uploadWordDataSection = (subjectId, wordId, wordData, sectionNumber) => {
    const featureNames = featureArraysNames[`section${sectionNumber}ElectrodeColumnsNames`];
    const partialColumnNames = _.values(predictionNames).concat(featureNames);
    const columnNames = _.values(sampleIdNames).concat(['EEG_data_section'], partialColumnNames);

    const valuesString = _.reduce(partialColumnNames, (values, columnName) => {
        return values.concat(`'${_.get(wordData, columnName)}', `);
    }, `'${config.primary_user_id}', '${subjectId}' ,'${wordId}', '${sectionNumber}', `); // subject_id,user_id,word_id

    const fixedValuesString = valuesString.slice(0, _.size(valuesString) - 2);

    const query = `INSERT INTO data_set (${columnNames.toString()})
                    VALUES (${fixedValuesString})`;

    return databaseUtils.executeQuery(query);
};

const saveValidationData = (subjectId, wordId, wordData, validationData) => {
    logger.info(`Saving the data regarding subject: ${subjectId} and word: ${wordId} to the validation set`);

    const clonedWordData = _.cloneDeep(wordData);

    const convertArraysToStrings = (agg, electrodeData, electrodeIndex) => {
        agg[electrodeIndex] = electrodeData.toString(); // eslint-disable-line no-param-reassign
        return agg;
    };

    const processedWordData = _.reduce(clonedWordData, convertArraysToStrings, {});

    _.set(processedWordData, 'user_id', config.primary_user_id);
    _.set(processedWordData, 'subject_id', subjectId);
    _.set(processedWordData, 'word_id', wordId);

    validationData.push(processedWordData);
};

const uploadWordData = (subjectId, wordId, wordData, validationSetIndexes, validationData) => {
    if (_.includes(validationSetIndexes, `${subjectId}%${wordId}`)) {
        return saveValidationData(subjectId, wordId, wordData, validationData);
    }

    logger.info(`Uploading the data regarding subject: ${subjectId} and word: ${wordId} to the DB`);

    // Each sample is saved in two rows due to row max size limit
    return Promise.all([
        uploadWordDataSection(subjectId, wordId, wordData, 1),
        uploadWordDataSection(subjectId, wordId, wordData, 2),
    ]);
};

const uploadSubjectData = (subjectId, validationSetIndexes, validationData) => {
    const wordsIds = _.range(1, config.words_per_subject + 1);

    return getSubjectDataFromRawData(subjectId)
        .then((subjectData) => {
            return Promise.each(wordsIds, (wordsId) => {
                return uploadWordData(subjectId, wordsId, subjectData[wordsId], validationSetIndexes, validationData);
            });
        });
};

module.exports = {
    init,
    uploadSubjectData,
    truncateDataSet,
};
