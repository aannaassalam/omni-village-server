const LandMeasurement = require("../Models/landMeasurement");

const handleErrors = (err) => {
  let errors = {};
  if (err.code === 11000) {
    errors.name = "Land Measurement already exists!";
    return errors;
  }
  return err;
};

module.exports.get_land_measurements = async (req, res) => {
  try {
    const measurement = await LandMeasurement.find();
    res.json(measurement);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
