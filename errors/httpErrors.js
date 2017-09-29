module.exports = {
    formParsingFailure: (err) => {
        return {
            message: `Formidable package failed to pars the request's form ${err}`,
            errorCode: 3000,
        };
    },
    predictionProcessFailure: (err) => {
        return {
            message: `The prediction process failed ${err}`,
            errorCode: 3001,
        };
    },
};
