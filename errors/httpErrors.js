module.exports = {
    formParsingFailure: (err) => {
        return {
            message: `Parsing the request's form by Formidable failed ${err}`,
            errorCode: 3000,
        };
    },
    algorithmsServerPredictionFailure: (msg) => {
        return {
            message: `Prediction process by the algorithms server failed: ${msg}`,
            errorCode: 3001,
        };
    },
    algorithmsServerValidationFailure: (msg) => {
        return {
            message: `Validation process by the algorithms server failed: ${msg}`,
            errorCode: 3002,
        };
    },
};
