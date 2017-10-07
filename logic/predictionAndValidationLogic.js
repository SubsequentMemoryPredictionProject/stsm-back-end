const _ = require('lodash');
const formidable = require('formidable');
const Promise = require('bluebird');

const errorUtils = require('../utils/errorUtils');
const csvUtils = require('../utils/csvUtils');
const databaseUtils = require('../utils/databaseUtils');
const sampleIdNames = require('../enums/sampleIdNames');
const featureArraysNames = require('../enums/featureArraysNames');
const predictionNames = require('../enums/predictionNames');
const httpErrors = require('../errors/httpErrors');

const {logger} = require('./../index').getInitParams();

const fromFilesToFileArray = (files) => {
    const fileArray = _.reduce(files, (array, file, fileName) => {
        file.name = fileName; // eslint-disable-line no-param-reassign
        array.push(_.cloneDeep(file));
        return array;
    }, []);

    return fileArray;
};

const fromHttpFormToFileArray = (req) => {
    return new Promise((resolve) => {
        const form = new formidable.IncomingForm();
        logger.info('Parsing the received http form');
        form.parse(req, (err, fields, files) => {
            if (err) {
                throw errorUtils.generate(httpErrors.formParsingFailure(err));
            }
            const fileArray = fromFilesToFileArray(files);
            resolve(fileArray);
        });
    });
};

const createSampleHandler = (sampleUploader, userId, samplesIds) => {
    const sampleHandler = (sample) => {
        const subjectId = parseInt(sample[0], 10);
        const wordId = parseInt(sample[1], 10);

        if (!subjectId || !wordId) {
            return;
        }

        if (_.isUndefined(samplesIds[subjectId])) {
            samplesIds[subjectId] = []; // eslint-disable-line no-param-reassign
        }
        samplesIds[subjectId].push(wordId);

        return Promise.all([
            sampleUploader(sample, userId, 1),
            sampleUploader(sample, userId, 2),
        ]);
    };

    return sampleHandler;
};

const deleteExistingSampleFromUserData = (sample, userId) => {
    const deletionQuery = `DELETE from user_data 
        where user_id = ${userId} AND subject_id = ${sample[0]} AND word_id = ${sample[1]}`;

    return databaseUtils.executeQuery(deletionQuery);
};

const uploadPredictionSampleSectionToDB = (sample, userId, eegDataSection) => {
    const sampleIdColumnNames = _.values(sampleIdNames).slice(1);
    const section1ElectrodeColumnsNames = featureArraysNames.section1ElectrodeColumnsNames;
    const section2ElectrodeColumnsNames = featureArraysNames.section2ElectrodeColumnsNames;

    const columnNamesForSection1 = ['EEG_data_section'].concat(_.values(sampleIdNames), section1ElectrodeColumnsNames);
    const partialColumnNamesForSection1 = sampleIdColumnNames.concat(section1ElectrodeColumnsNames);
    const columnNamesForSection2 = ['EEG_data_section'].concat(_.values(sampleIdNames), section2ElectrodeColumnsNames);
    const partialColumnNamesForSection2 = sampleIdColumnNames.concat(section2ElectrodeColumnsNames);

    const queryColumnNames = eegDataSection === 1 ? columnNamesForSection1 : columnNamesForSection2;
    const partialColumnNames = eegDataSection === 2 ? partialColumnNamesForSection1 : partialColumnNamesForSection2;
    const valuesString = _.reduce(partialColumnNames, (values, columnName, columnIndex) => {
        const currIndex = eegDataSection === 2 && columnIndex > 2 ? columnIndex + 6 : columnIndex;
        const currValuesString = values.concat(`'${sample[currIndex]}', `);
        return currValuesString;
    }, `'${eegDataSection}', '${userId}', `);
    const fixedValuesString = valuesString.slice(0, -2);

    const insertionQuery = `INSERT INTO user_data (${queryColumnNames.toString()})
                    VALUES (${fixedValuesString})`;

    return deleteExistingSampleFromUserData(sample, userId)
        .then(() => databaseUtils.executeQuery(insertionQuery));
};

const uploadValidationSampleSectionToDB = (sample, userId) => {
    const idColumnNames = ['EEG_data_section'].concat(_.values(sampleIdNames));
    const queryColumnNames = idColumnNames.concat(_.values(predictionNames));

    const valuesQueryPart = _.reduce(queryColumnNames.slice(2), (valuesString, columnName, columnId) => {
        return valuesString.concat(`${sample[columnId]}, `);
    }, `1, ${userId}, `).slice(0, -2); // EEG_data_section, user_id

    const updateQueryPart = _.reduce(queryColumnNames, (updateString, columnName) => {
        return updateString.concat(`${columnName} = Values(${columnName}), `);
    }, '').slice(0, -3);

    const query = `INSERT INTO user_data (${queryColumnNames})
    VALUES (${valuesQueryPart})
    ON DUPLICATE KEY UPDATE ${updateQueryPart})`;

    return databaseUtils.executeQuery(query);
};

const uploadReceivedFilesToTheDB = (req, userId, sampleUploader, subjectsAndWordIdsAgg) => {
    return fromHttpFormToFileArray(req)
        .then((fileArray) => {
            const sampleHandler = createSampleHandler(
                sampleUploader,
                userId,
                subjectsAndWordIdsAgg
            );

            return Promise.each(fileArray, (file) => {
                logger.info(`A file named ${file.name} was uploaded by user id ${userId}`);
                return csvUtils.each(file.path, sampleHandler);
            });
        });
};

module.exports = {
    uploadReceivedFilesToTheDB,
    uploadPredictionSampleSectionToDB,
    uploadValidationSampleSectionToDB,
};
