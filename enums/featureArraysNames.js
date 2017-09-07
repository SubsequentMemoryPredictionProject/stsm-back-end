const _ = require('lodash');

const electrodeIds = [1, 2, 3, 4];
const subElectrodeIds = [1, 2, 3];

const electrodeColumns = _.reduce(electrodeIds, (agg, elecId) => {
    _.each(subElectrodeIds, (subElecId) => {
        const columnName = `signal_elec${elecId}_subelec${subElecId}`;
        agg.push(columnName);
    }, []);
    return agg;
}, []);

// An array of the name of pair-electrodes in the experiment
module.exports = electrodeColumns;
