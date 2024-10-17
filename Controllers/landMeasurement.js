const LandMeasurement = require("../Models/landMeasurement");

module.exports.get_land_measurements = async (req, res) => {
    const measurement = await LandMeasurement.find({});
    return res.json(measurement);
};
