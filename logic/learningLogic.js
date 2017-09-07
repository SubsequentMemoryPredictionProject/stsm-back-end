const _ = require('lodash');
const Promise = require('bluebird');

const predictionNames = require('../enums/predictionNames');
// const featureArraysNames = require('../enums/featureArraysNames');
const csvUtils = require('./../utils/csvUtils');
const databaseUtils = require('../utils/databaseUtils');

const INPUT_FOLDER = './input';
const USER_ID = 1; // noam brezis userId (the researcher)

let logger;

const init = (initParams) => {
    logger = initParams.logger;
};

const getSubjectDataFromRawData = (subjectId) => {
    const subjectData = {};
    const electrodeIds = [1, 2, 3, 4];
    const subElectrodeIds = [1, 2, 3];

    return Promise.resolve()
        .then(() => {
            const confidenceFile = `${INPUT_FOLDER}/raw_data/Confidence_S${subjectId}.csv`;
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
                    // const sampleName = `signal_elec${elecId}_subelec${subElecId}`;
                    let wordId = 1;
                    return csvUtils.each(sampleFile, (eegData) => {
                        //console.log(`${wordId}.${elecId}.${subElecId}`)
                        _.set(subjectData, `${wordId}.elec${elecId}.sub_elec${subElecId}`, eegData);
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

const uploadWordData = (subjectId, wordId, wordData) => {

    console.log(subjectId, wordId);
    const electrode = 1;
    const sub_electrode = 1;

    const partialColumnNames = _.values(predictionNames);

    const valuesString = _.reduce(partialColumnNames, (values, columnName) => {
        return values.concat(`'${_.get(wordData, columnName)}', `);
    }, `'${subjectId}','1','${wordId}','${electrode}','${sub_electrode}',`); // subject_id,user_id,word_id

    console.log(wordData['elec1']['sub_elec1'].toString())
    const exValuesString = valuesString.concat(`'${wordData['elec1']['sub_elec1'].toString()}'`);
    // const fixedValuesString = exValuesString.slice(0, _.size(exValuesString) - 2);

    const columnNames = ['subject_id', 'user_id', 'word_id', 'electrode', 'sub_electrode'].concat(partialColumnNames, ['sample']);

    const query = `INSERT INTO data_set (${columnNames.toString()})
                    VALUES (${exValuesString})`;
    return databaseUtils.executeQuery(query);
};

const uploadSubjectData = (subjectId) => {
    const wordsIds = _.range(1, 401);

    return getSubjectDataFromRawData(subjectId)
        .then((subjectData) => {
            return Promise.each(wordsIds, (wordsId) => {
                return uploadWordData(subjectId, wordsId, subjectData[wordsId]);
            });
        });
};

module.exports = {
    init,
    uploadSubjectData,
};
