const _ = require('lodash');
const Promise = require('bluebird');

const predictionNames = require('../enums/predictionNames');
const featureArraysNames = require('../enums/featureArraysNames');
const csvUtils = require('./../utils/csvUtils');
const databaseUtils = require('../utils/databaseUtils');

let logger, config;

const init = (initParams) => {
    logger = initParams.logger;
    config = initParams.config;
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
            logger.info(`finished loading confidence data for subject #${subjectId}`);
            const oldNewFile = `${INPUT_FOLDER}/raw_data/OldNew_S${subjectId}.csv`;
            let wordId = 1;
            return csvUtils.each(oldNewFile, (oldNewData) => {
                _.set(subjectData, `${wordId}.${predictionNames.STM}`, oldNewData[0]);
                _.set(subjectData, `${wordId}.${predictionNames.LTM}`, oldNewData[1]);
                wordId++;
            });
        })
        .then(() => {
            logger.info(`finished loading old/new data for subject #${subjectId}`);
            const rkFile = `${INPUT_FOLDER}/raw_data/RK_S${subjectId}.csv`;
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
            logger.info(`finished loading remember/know data for subject #${subjectId}`);
            return Promise.each(electrodeIds, (elecId) => {
                return Promise.each(subElectrodeIds, (subElecId) => {
                    const sampleFile = `${INPUT_FOLDER}/raw_data/Signal_S${subjectId}_Elec${elecId}_SubElec${subElecId}.csv`;
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
            logger.info(`finished loading EEG data for subject #${subjectId}`);
            return subjectData;
        });
};

const uploadWordDataSection = (subjectId, wordId, wordData, sectionNumber) => {
    const featureNames = featureArraysNames[`section${sectionNumber}ElectrodeColumnsNames`]
    const partialColumnNames = _.values(predictionNames).concat(featureNames);
    const valuesString = _.reduce(partialColumnNames, (values, columnName) => {
        return values.concat(`'${_.get(wordData, columnName)}', `);
    }, `'${subjectId}','${config.primary_user_id}','${wordId}', '${sectionNumber}', `); // subject_id,user_id,word_id

    const fixedValuesString = valuesString.slice(0, _.size(valuesString) - 2);

    const columnNames = ['subject_id', 'user_id', 'word_id', 'EEG_data_section'].concat(partialColumnNames);
    const query = `INSERT INTO data_set (${columnNames.toString()})
                    VALUES (${fixedValuesString})`;
    return databaseUtils.executeQuery(query);
};

// TODO features should be strings '3.444, -6.777' and not arrays of strings
const saveValidationData = (subjectId, wordId, wordData, validationData) => {
    const clonedWordData = _.cloneDeep(wordData);
    _.set(clonedWordData, 'user_id', USER_ID);
    _.set(clonedWordData, 'subject_id', subjectId);
    _.set(clonedWordData, 'word_id', wordId);
    validationData.push(clonedWordData);
};

const uploadWordData = (subjectId, wordId, wordData, validationSetIndexes, validationData) => {
    console.log(subjectId, wordId);
    if (_.includes(validationSetIndexes, `${subjectId}%${wordId}`)) {
        return saveValidationData(subjectId, wordId, wordData, validationData);
    }

    return Promise.all([
        uploadWordDataSection(subjectId, wordId, wordData, 1),
        uploadWordDataSection(subjectId, wordId, wordData, 2),
    ]);
};

const uploadSubjectData = (subjectId, validationSetIndexes, validationData) => {
    const wordsIds = _.range(1, 401);

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
};
