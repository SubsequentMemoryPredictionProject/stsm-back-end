const os = require('os'); // to get the os's EOL char
const json2csv = require('json2csv');
const fastCsv = require('fast-csv');

const errors = require('../utils/errorUtils');
const csvErrors = require('../errors/csvErrors');

const convertJsonToCsv = (fields, {quotes = '"', items = [], hasColumnTitles = true} = {}) => {
    return new Promise((resolve, reject) => {
        const json2csvOptions = {
            data: items,
            hasCSVColumnTitle: hasColumnTitles,
            fields,
            quotes,
        };

        json2csv(json2csvOptions, (err, csv) => {
            if (err) return reject(errors.reGenerate(err, csvErrors.converteJsonToCsvFailure(json2csvOptions)));
            resolve(csv);
        });
    });
};

const writeToStream = (writeStream, csv, {encoding} = {}) => {
    return new Promise((resolve, reject) => {
        writeStream.write(csv + os.EOL, encoding, (err) => {
            if (err) return reject(errors.reGenerate(err, csvErrors.writeToStreamFailure(writeStream, csv)));

            resolve();
        });
    });
};

const generateWriteHandler = (fields, writeStream, {quotes = '"', encoding} = {}) => {
    return (items) => {
        return Promise.resolve()
            .then(() => {
                return convertJsonToCsv(fields, {quotes, items, hasColumnTitles: false});
            })
            .then((csv) => {
                return writeToStream(writeStream, csv, {encoding});
            });
    };
};

// TODO needed?
const initWrite = (fields, writeStream, {quotes = '"', items = [], encoding} = {}) => {
    return Promise.resolve()
        .then(() => {
            return convertJsonToCsv(fields, {quotes, items});
        })
        .then((csv) => {
            return writeToStream(writeStream, csv, {encoding});
        })
        .then(() => {
            return generateWriteHandler(fields, writeStream, {quotes});
        });
};

const each = (filePath, itemHandler) => {
    return new Promise((resolve, reject) => {
        fastCsv.fromPath(filePath, {ignoreEmpty: true})
            .on('data', (item) => {
                itemHandler(item);
            })
            .on('end', () => {
                return resolve();
            })
            .on('error', (err) => {
                return reject(err);
            });
    });
};

module.exports = {
    each,
    convertJsonToCsv,
    initWrite,
};
