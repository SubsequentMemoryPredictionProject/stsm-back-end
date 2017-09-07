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
    amazon_rds: {
        host: 'stsm.czcokqfhjscu.us-east-1.rds.amazonaws.com',
        user: 'master',
        password: '12345678',
        port: 3306,
        database: 'STSMDB',
    },
};
