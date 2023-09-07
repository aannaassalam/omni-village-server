const WeightMeasurement = require("../Models/weightMeasurement");

const handleErrors = (err) => {
  let errors = {};
  if (err.code === 11000) {
    errors.name = "Weight Measurement already exists!";
    return errors;
  }
  return err;
};

module.exports.get_weight_measurements = async (req, res) => {
  try {
    const measurement = await WeightMeasurement.find();
    res.json(measurement);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
