const generate = ({message, errorCode, httpCode}) => {
    const err = new Error(message);
    err.errorCode = errorCode;
    err.httpCode = httpCode;

    return err;
};

module.exports = {
    generate,
};
