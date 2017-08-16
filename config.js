module.exports = {
    httpPort: 3101,
    logger: {
        transports: [
            {
                type: 'Console',
                options: {level: 'debug'},
            },
            {
                type: 'File',
                options: {
                    filename: 'logs/algo_research.log',
                    maxsize: 1048576 * 100, // 100mb
                    colorize: true,
                    timestamp: true,
                    prettyPrint: true,
                    level: 'debug',
                    json: false,
                    tailable: true,
                },
            },
        ],
    },
};
