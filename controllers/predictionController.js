const fs = require('fs');
const _ = require('lodash');
const formidable = require('formidable');

const predictionNames = require('../enums/predictionNames');
const csvUtils = require('../utils/csvUtils');

const OUTPUT_FOLDER = './output/stsmPrediction';

module.exports = (app) => {
    app.post('/', (req, res) => {
        const form = new formidable.IncomingForm();
        form.parse(req);

        form.on('fileBegin', (name, file) => {
            file.path = OUTPUT_FOLDER + '/uploads/' + file.name;
        });

        form.on('file', function (name, file){
            console.log('Uploaded ' + file.name);
        });

        res.sendFile(OUTPUT_FOLDER + '/index.html');
    });

    // send file
    app.get('/stsm/get_file', (req, res) => {
        res.attachment('../amazing.txt');

        res.download("./path");
    });

    app.post('/', function (req, res){
        var form = new formidable.IncomingForm();

        form.parse(req);

        form.on('fileBegin', function (name, file){
            file.path = __dirname + '/uploads/' + file.name;
        });

        form.on('file', function (name, file){
            console.log('Uploaded ' + file.name);
        });

        res.sendFile(__dirname + '/index.html');
    });

    // TODO test remove
    app.get('/stsm/test', (req, res) => {
        const csvWriteStream = fs.createWriteStream(`${OUTPUT_FOLDER}/results.csv`, {flags: 'w+'});
        const csvFieldNames = ['user_name', 'subject_id', 'word_id', ...(_.values(predictionNames))];
        console.log(csvFieldNames)
        return csvUtils.initWrite(csvFieldNames, csvWriteStream)
            .then((extendedWriteHandler) => {
                const exp = [
                    {
                        user_name: 'gal',
                        subject_id: 's1',
                        word_id: 'w1',
                        STM: true,
                        STM_confidence_level: 1,
                        STM_remember_know: 'remember',
                        LTM: true,
                        LTM_confidence_level: 1,
                        LTM_remember_know: 'remember',
                    },
                    {
                        user_name: 'gal',
                        subject_id: 's2',
                        word_id: 'w2',
                        STM: false,
                        STM_confidence_level: 4,
                        STM_remember_know: 'know',
                        LTM: false,
                        LTM_confidence_level: 4,
                        LTM_remember_know: 'know',
                    },
                ];
                return extendedWriteHandler(exp);
            })
            .then(() => {

                return csvUtils.each(`${OUTPUT_FOLDER}/results.csv`, console.log)
            });

        if (csvWriteStream) {
            csvWriteStream.end();
        }
    });
};
