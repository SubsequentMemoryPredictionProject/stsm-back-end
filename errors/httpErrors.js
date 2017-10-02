module.exports = {
    formParsingFailure: (err) => {
        return {
            message: `Parsing the request's form by Formidable failed ${err}`,
            errorCode: 3000,
        };
    },
};
