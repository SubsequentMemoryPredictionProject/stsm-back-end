const _ = require('lodash');

const createElectrodeColumnsNames = (eegDataSection) => {
    const electrodeIds = eegDataSection === 1 ? [1, 2] : [3, 4];
    const subElectrodeIds = [1, 2, 3];

    return _.reduce(electrodeIds, (electrodeColumnsNames, elecId) => {
        _.each(subElectrodeIds, (subElecId) => {
            const columnName = `signal_elec${elecId}_subelec${subElecId}`;
            electrodeColumnsNames.push(columnName);
        }, []);
        return electrodeColumnsNames;
    }, []);
};

const section1ElectrodeColumnsNames = createElectrodeColumnsNames(1);
const section2ElectrodeColumnsNames = createElectrodeColumnsNames(2);

module.exports = {
    section1ElectrodeColumnsNames,
    section2ElectrodeColumnsNames,
    electrodeColumnsNames: section1ElectrodeColumnsNames.concat(section2ElectrodeColumnsNames),
};
