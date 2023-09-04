const FisheryCrop = require("../Models/fisheryCrop");

const handleErrors = (err) => {
  let errors = {};
  if (err.code === 11000) {
    errors.name = "Fish already exists!";
    return errors;
  }
  return err;
};

module.exports.get_fishery_crop = async (req, res) => {
  try {
    const fishery = await FisheryCrop.find();
    res.json(fishery);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_fishery_crop = async (req, res) => {
  const { name } = req.body;
  try {
    const fishery_doc = await FisheryCrop.create({
      name,
    });
    res.json(fishery_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.edit_fishery_crop = async (req, res) => {
  const { name, fishery_crop_id } = req.body;
  try {
    const fishery_doc = await FisheryCrop.findByIdAndUpdate(
      fishery_crop_id,
      {
        name,
      },
      { new: true, runValidators: true }
    );
    res.json(fishery_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_fishery_crop = async (req, res) => {
  const { id } = req.params;
  try {
    const fishery_doc = await FisheryCrop.findByIdAndDelete(id);
    res.json(fishery_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
