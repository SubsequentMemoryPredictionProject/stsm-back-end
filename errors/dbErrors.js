module.exports = {
    dbConnectionFailure: (err) => {
        return {
            message: `DB connection attempt failed ${err}`,
            errorCode: 2000,
        };
    },
    dbConnectionTerminationFailure: (err) => {
        return {
            message: `DB disconnection attempt failed ${err}`,
            errorNumber: 2001,
        };
    },
    dbQueryFailure: (err) => {
        return {
            message: `DB query attempt failed ${err}`,
            errorCode: err.code,
            errorNumber: 2002,
        };
    },
};
