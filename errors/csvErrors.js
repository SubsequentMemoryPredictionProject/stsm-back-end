module.exports = {
    convertJsonToCsvFailure: (json2csvOptions) => {
        return {
            message: `Converting JSON to csv failed: ${json2csvOptions}`,
            errorCode: 1000,
        };
    },
    writeToStreamFailure: (stream, content) => {
        return {
            message: `Writing to stream failed: ${stream}, ${content}`,
            errorCode: 1001,
        };
    },
    writeCsvToFileFailure: () => {
        return {
            message: 'Writing csv to file failed',
            errorCode: 1002,
        };
    },
};
