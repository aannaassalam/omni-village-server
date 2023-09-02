const HuntingCrop = require("../Models/huntingCrop");

const handleErrors = (err) => {
  let errors = {};
  if (err.code === 11000) {
    errors.name = "Live stock already exists!";
    return errors;
  }
  return err;
};

module.exports.get_hunting_crop = async (req, res) => {
  try {
    const hunting = await HuntingCrop.find();
    res.json(hunting);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_hunting_crop = async (req, res) => {
  const { name } = req.body;
  try {
    const hunting_doc = await HuntingCrop.create({
      name,
    });
    res.json(hunting_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.edit_hunting_crop = async (req, res) => {
  const { name, hunting_crop_id } = req.body;
  try {
    const hunting_doc = await HuntingCrop.findByIdAndUpdate(
      hunting_crop_id,
      {
        name,
      },
      { new: true, runValidators: true }
    );
    res.json(hunting_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_hunting_crop = async (req, res) => {
  const { id } = req.params;
  try {
    const hunting_doc = await HuntingCrop.findByIdAndDelete(hunting_crop_id);
    res.json(hunting_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
