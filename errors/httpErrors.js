module.exports = {
    formParsingFailure: (err) => {
        return {
            message: `Parsing the request's form by Formidable failed ${err}`,
            errorCode: 3000,
        };
    },
    algorithmsServerConnectionFailure: () => {
        return {
            message: `Sending a prediction request to the algorithms server failed`,
            errorCode: 3001,
        };
    },
    algorithmsServerPredictionFailure: () => {
        return {
            message: `Prediction process by the algorithms server failed`,
            errorCode: 3002,
        };
    },
};
