const learningLogic = require('../logic/learningLogic')

module.exports =
    learningLogic.createElectrodeColumnsNames(1)
        .concat(learningLogic.createElectrodeColumnsNames(2));
