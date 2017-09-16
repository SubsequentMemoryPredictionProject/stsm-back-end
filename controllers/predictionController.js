const fs = require('fs');
const _ = require('lodash');
const Promise = require('bluebird');
const formidable = require('formidable');
const request = require('request-promise');

const predictionNames = require('../enums/predictionNames');
const csvUtils = require('../utils/csvUtils');

const OUTPUT_FOLDER = '/Users/gal/Projects/stsm-back-end/output/stsmPrediction';
let numberOfFiles;

module.exports = (app) => {
    app.post('/stsm/prediction/uploadEegFiles', (req, res) => {
        const form = new formidable.IncomingForm();
        return form.parse(req, (err, fields, files) => {
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
                numberOfFiles = _.size(files);
                return request({
                    uri: 'http://54.86.164.123:3100/test',
                    json: true // Automatically parses the JSON string in the response
                })
            }).then((resp) => {
                console.log('gal', resp);
                res.json({msg: `${numberOfFiles} file were uploaded`, success: true});
            })
            // .catch(function (err) {
            //     // API call failed...
            // });
        });
    });

    app.get('/stsm/prediction/getResults', (req, res) => {
        res.sendFile(`${OUTPUT_FOLDER}/results.csv`);
    });

};
