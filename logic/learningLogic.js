const _ = require('lodash');
const Promise = require('bluebird');

const predictionNames = require('../enums/predictionNames');
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

const createElectrodeColumnsNames = (eegDataSection) => {
    const electrodeIds = eegDataSection === 1 ? [1, 2] : [3, 4];
    const subElectrodeIds = [1, 2, 3];
    return _.reduce(electrodeIds, (agg, elecId) => {
        _.each(subElectrodeIds, (subElecId) => {
            const columnName = `signal_elec${elecId}_subelec${subElecId}`;
            agg.push(columnName);
        }, []);
        return agg;
    }, []);
};

const uploadWordDataSection = (subjectId, wordId, wordData, sectionNumber) => {
    const featureArraysNames = createElectrodeColumnsNames(sectionNumber);
    const partialColumnNames = _.values(predictionNames).concat(featureArraysNames);
    const valuesString = _.reduce(partialColumnNames, (values, columnName) => {
        return values.concat(`'${_.get(wordData, columnName)}', `);
    }, `'${subjectId}','${USER_ID}','${wordId}', '${sectionNumber}', `); // subject_id,user_id,word_id

    const fixedValuesString = valuesString.slice(0, _.size(valuesString) - 2);

    const columnNames = ['subject_id', 'user_id', 'word_id', 'EEG_data_section'].concat(partialColumnNames);
    const query = `INSERT INTO data_set (${columnNames.toString()})
                    VALUES (${fixedValuesString})`;
    console.log(JSON.stringify(query));
    return databaseUtils.executeQuery(query);
};


const uploadWordData = (subjectId, wordId, wordData) => {
    console.log(subjectId, wordId);

    return Promise.all([
        uploadWordDataSection(subjectId, wordId, wordData, 1),
        uploadWordDataSection(subjectId, wordId, wordData, 2),
    ]);
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

const createValidationSet = () => {

};

module.exports = {
    init,
    uploadSubjectData,
    createValidationSet,
};
