module.exports = {
    dbConnectionFailure: (err) => {
        return {
            message: `DB connection attempt failed ${err}`,
            errorCode: 100,
        };
    },
    dbConnectionTerminationFailure: (err) => {
        return {
            message: `DB disconnection attempt failed ${err}`,
            errorNumber: 101,
        };
    },
    dbQueryFailure: (err) => {
        return {
            message: `DB query attempt failed ${err}`,
            errorCode: err.code,
            errorNumber: 102,
        };
    },
};
