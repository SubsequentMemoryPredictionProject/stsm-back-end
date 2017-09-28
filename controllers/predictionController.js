const _ = require('lodash');
const Promise = require('bluebird');
const formidable = require('formidable');
const request = require('request-promise');
const {config, logger} = require('./../index').getInitParams();

const sampleIdNames = require('../enums/sampleIdNames');
const featureArraysNames = require('../enums/featureArraysNames');
const predictionNames = require('../enums/predictionNames');

const csvUtils = require('../utils/csvUtils');
const errorUtils = require('../utils/errorUtils');
const databaseUtils = require('../utils/databaseUtils');
const httpErrors = require('../errors/httpErrors');

module.exports = (app) => {
    app.post('/stsm/prediction/uploadFiles', (req, res) => {
        const form = new formidable.IncomingForm();
        const userId = req.query.user_id;
        return Promise.resolve()
            .then(() => {
                return form.parse(req, (err, fields, files) => {
                    if (err) {
                        throw errorUtils.generate(httpErrors.formParsingFailure(err));
                    }

                    const fileArray = _.reduce(files, (array, file, fileName) => {
                        file.name = fileName; // eslint-disable-line no-param-reassign
                        array.push(_.cloneDeep(file));
                        return array;
                    }, []);

                    // TODO ERROR IN CASE OF MORE THAN ONE FILE
                    const subjectsWords = {};
                    const columnNamesForSection1 = ['EEG_data_section'].concat(_.values(sampleIdNames), featureArraysNames.section1ElectrodeColumnsNames);
                    const partialColumnNamesForSection1 = (_.values(sampleIdNames).slice(1)).concat(featureArraysNames.section1ElectrodeColumnsNames);
                    const columnNamesForSection2 = ['EEG_data_section'].concat(_.values(sampleIdNames), featureArraysNames.section2ElectrodeColumnsNames);
                    const partialColumnNamesForSection2 = (_.values(sampleIdNames).slice(1)).concat(featureArraysNames.section2ElectrodeColumnsNames);

                    const uploadSampleSection = (sample, eegDataSection) => {
                        const columnNames = eegDataSection === 1 ? columnNamesForSection1 : columnNamesForSection2;
                        const partialColumnNames = eegDataSection === 2 ? partialColumnNamesForSection1 : partialColumnNamesForSection2;
                        const valuesString = _.reduce(partialColumnNames, (values, columnName, columnIndex) => {
                            const currIndex = eegDataSection === 2 && columnIndex > 2 ? columnIndex + 6 : columnIndex;
                            const currValuesString = values.concat(`'${sample[currIndex]}', `);
                            return currValuesString;
                        }, `'${eegDataSection}', '${userId}', `); // subject_id,user_id,word_id
                        const fixedValuesString = valuesString.slice(0, _.size(valuesString) - 2);

                        const query = `INSERT INTO user_data (${columnNames.toString()})
                    VALUES (${fixedValuesString})`;

                        return databaseUtils.executeQuery(query);
                    };

                    // TODO handel better
                    let firstCall = 1;

                    const sampleHandler = (sample) => {
                        if (firstCall) {
                            firstCall = 0;
                            return;
                        }
                        const subjectId = sample[0];
                        const wordId = sample[1];

                        if (_.isUndefined(subjectsWords[subjectId])) {
                            subjectsWords[subjectId] = [];
                        }
                        subjectsWords[subjectId].push(wordId);

                        return Promise.all([
                            uploadSampleSection(sample, 1),
                            uploadSampleSection(sample, 2),
                        ]);
                    };

                    return Promise.each(fileArray, (file) => {
                        logger.info(`A file named ${file.name} was uploaded by the front-end`);
                        return csvUtils.each(file.path, sampleHandler);
                    })
                        .then((parsedBody) => {
                            // if (parsedBody.success === 'false') {
                            //     // TODO handel error
                            // }
                            console.log(subjectsWords)
                            const columnNames = _.values(predictionNames);

                            const queryAndPart = _.reduce(subjectsWords, (ANDString, wordArray, subjectId) => {
                                return `${ANDString} (subject_id = subjectId, word_id in ${ANDString})`;
                            }, '');

                            const predictionQuery = `SELECT ${columnNames.toString()}
                            FROM untagged_predictions
                            WHERE user_id=${userId}
                            AND ${queryAndPart}`;

                            // TODO
                            logger.info(predictionQuery);

                            // return databaseUtils.executeQuery(predictionQuery);
                        }).then(() => {
                            res.json({msg: 'Prediction process was successfully over', success: true});
                            res.sendFile(`${config.output_folder}/results.csv`);
                        });
                });
            });
        // .then(() => {
        //     then((resp) => {
        //     }).catch((err) => { // TODO
        //         throw errorUtils.generate(httpErrors.predictionProcessFailure(err));
        //     });
        // });
    });
};
