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
                    filename: 'logs/stsm-back-end.log',
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
        host: 'stsmdb.czcokqfhjscu.us-east-1.rds.amazonaws.com',
        user: 'master',
        password: '12345678',
        port: 3306,
        database: 'STSMDB',
    },
    algorithms_server: {
        ip: '54.86.164.123:3100',
    },
    validation_set_size: 8800, // 1760,
    projectPath: __dirname,
    output_folder: `${__dirname}/output/prediction`,
};
