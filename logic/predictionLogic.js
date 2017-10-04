const _ = require('lodash');

const databaseUtils = require('../utils/databaseUtils');
const sampleIdNames = require('../enums/sampleIdNames');
const featureArraysNames = require('../enums/featureArraysNames');

const sampleIdColumnNams = _.values(sampleIdNames).slice(1);
const section1ElectrodeColumnsNames = featureArraysNames.section1ElectrodeColumnsNames;
const section2ElectrodeColumnsNames = featureArraysNames.section2ElectrodeColumnsNames;

const columnNamesForSection1 = ['EEG_data_section'].concat(_.values(sampleIdNames), section1ElectrodeColumnsNames);
const partialColumnNamesForSection1 = sampleIdColumnNams.concat(section1ElectrodeColumnsNames);
const columnNamesForSection2 = ['EEG_data_section'].concat(_.values(sampleIdNames), section2ElectrodeColumnsNames);
const partialColumnNamesForSection2 = sampleIdColumnNams.concat(section2ElectrodeColumnsNames);

const fromFilesToFileArray = (files) => {
    const fileArray = _.reduce(files, (array, file, fileName) => {
        file.name = fileName; // eslint-disable-line no-param-reassign
        array.push(_.cloneDeep(file));
        return array;
    }, []);

    return fileArray;
};

const uploadSampleSectionToDB = (sample, eegDataSection, userId) => {
    const columnNames = eegDataSection === 1 ? columnNamesForSection1 : columnNamesForSection2;
    const partialColumnNames = eegDataSection === 2 ? partialColumnNamesForSection1 : partialColumnNamesForSection2;
    const valuesString = _.reduce(partialColumnNames, (values, columnName, columnIndex) => {
        const currIndex = eegDataSection === 2 && columnIndex > 2 ? columnIndex + 6 : columnIndex;
        const currValuesString = values.concat(`'${sample[currIndex]}', `);
        return currValuesString;
    }, `'${eegDataSection}', '${userId}', `); // subject_id, user_id, word_id
    const fixedValuesString = valuesString.slice(0, _.size(valuesString) - 2);

    const query = `INSERT INTO user_data (${columnNames.toString()})
                    VALUES (${fixedValuesString})`;

    return databaseUtils.executeQuery(query);
};

module.exports = {
    fromFilesToFileArray,
    uploadSampleSectionToDB,
};
