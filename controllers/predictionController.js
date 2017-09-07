const fs = require('fs');
const _ = require('lodash');
const Promise = require('bluebird');
const formidable = require('formidable');

const predictionNames = require('../enums/predictionNames');
const csvUtils = require('../utils/csvUtils');

const OUTPUT_FOLDER = '/Users/gal/Projects/stsm-back-end/output/stsmPrediction';

module.exports = (app) => {
    app.post('/stsm/prediction/uploadEegFiles', (req, res) => {
        const form = new formidable.IncomingForm();
        form.parse(req, (err, fields, files) => {
            const fileArray = _.reduce(files, (array, file, fileName) => {
                console.log('array', array)
                file.name = fileName; // eslint-disable-line no-param-reassign
                array.push(file);
                return array;
            }, []);

            console.log(fileArray);

            return Promise.each(fileArray, (file) => {
                console.log(file.name);
                return csvUtils.each(file.path, console.log);
            }).then(() => {
                const numberOfFiles = _.size(files);
                res.json({msg: `${numberOfFiles} file were uploaded`, success: true});
            });
        });
    });

    app.get('/stsm/prediction/getResults', (req, res) => {
        res.sendFile(`${OUTPUT_FOLDER}/results.csv`);
    });
};
