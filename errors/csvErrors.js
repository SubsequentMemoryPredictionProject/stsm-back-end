module.exports = {
    failureInConvertingJsonToCsv: (json2csvOptions) => {
        return {message: `Unable to convert to csv: ${json2csvOptions}`, code: 1000};
    },
    failureInWritingToStream: (stream, content) => {
        return {message: `Unable to to write to stream: ${stream}, ${content}`, code: 1001};
    },
    failureInWriteFile: () => {
        return {message: 'Unable to to write csv to file', code: 1002};
    },
    unexpectedError: () => {
        return {message: 'Unexpected Error, go to the log for more details...', zeekErrorCode: 1003};
    },
};
