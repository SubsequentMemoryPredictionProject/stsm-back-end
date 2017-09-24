const fs = require('fs');
const _ = require('lodash');
const Promise = require('bluebird');
const formidable = require('formidable');
const request = require('request-promise');
const {config} = require('./../index').getInitParams();

const predictionNames = require('../enums/predictionNames');
const csvUtils = require('../utils/csvUtils');
const errorUtils = require('../utils/errorUtils');
const httpErrors = require('../errors/httpErrors');


let numberOfFiles;

module.exports = (app) => {
    app.post('/stsm/prediction/uploadFiles', (req, res) => {
        const form = new formidable.IncomingForm();
        return form.parse(req, (err, fields, files) => {
            if (err) {
                throw errorUtils.generate(httpErrors.formParsingFailure(err));
            }

            const fileArray = _.reduce(files, (array, file, fileName) => {
                file.name = fileName; // eslint-disable-line no-param-reassign
                array.push(file);
                return array;
            }, []);

            return fileArray;
        }).then((fileArray) => {
            numberOfFiles = _.size(fileArray);

            return Promise.each(fileArray, (file) => {
                console.log(file.name);
                return csvUtils.each(file.path, console.log);

                return request({
                    uri: 'http://54.86.164.123:3100/test',
                    json: true, // Automatically parses the JSON string in the response
                });
            }).then((resp) => {
                res.json({msg: `${numberOfFiles} file were uploaded`, success: true});
            })
                .catch((err) => {
                    throw errorUtils.generate(httpErrors.predictionProcessFailure(err));
                });
        });
    });

    app.get('/stsm/prediction/getResults', (req, res) => {
        res.sendFile(`${config.output_folder}/results.csv`);
    });

};
