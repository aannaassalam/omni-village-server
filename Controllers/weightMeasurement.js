const WeightMeasurement = require("../Models/weightMeasurement");

module.exports.get_weight_measurements = async (req, res) => {
    const measurement = await WeightMeasurement.find({});
    return res.json(measurement);
};
