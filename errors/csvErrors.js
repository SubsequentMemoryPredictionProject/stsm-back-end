const paramMustBeFunMessage = (paramName) => {
    return `The ${paramName} param must be a function`;
};

module.exports = {
    itemsFetcherMustBeAFunc: () => {
        return {message: paramMustBeFunMessage('itemsFetcher'), code: 1000};
    },
    iteratorMustBeAFunc: () => {
        return {message: paramMustBeFunMessage('iterator'), code: 1001};
    },
    funcMustBeAFunc: () => {
        return {message: paramMustBeFunMessage('func'), code: 1002};
    },
    onAttemptFailureMustBeAFunc: () => {
        return {message: paramMustBeFunMessage('onAttemptFailure'), code: 1003};
    },
    failureInConvertingJsonToCsv: (json2csvOptions) => {
        return {message: `Unable to convert to csv: ${json2csvOptions}`, code: 1004};
    },
    failureInWritingToStream: (stream, content) => {
        return {message: `Unable to to write to stream: ${stream}, ${content}`, code: 1005};
    },
    failureInWriteFile: () => {
        return {message: 'Unable to to write csv to file', code: 1006};
    },
    unexpectedError: () => {
        return {message: 'Unexpected Error, go to the log for more details...', zeekErrorCode: 1007};
    },
};
