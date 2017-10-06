module.exports = {
    convertJsonToCsvFailure: (json2csvOptions) => {
        return {message: `Converting JSON to csv failed: ${json2csvOptions}`, code: 1000};
    },
    writeToStreamFailure: (stream, content) => {
        return {message: `Writing to stream failed: ${stream}, ${content}`, code: 1001};
    },
    writeCsvToFileFailure: () => {
        return {message: 'Writing csv to file failed', code: 1002};
    },
};
