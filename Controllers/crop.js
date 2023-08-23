const Crop = require("../Models/crop");

const handleErrors = (err) => {
  let errors = {};
  if (err.code === 11000) {
    errors.name = "Crop already exists!";
    return errors;
  }
  return err;
};

module.exports.get_crop = async (req, res) => {
  try {
    const { categoryId } = req.body;
    const crops = await Crop.find(
      categoryId ? { categoryId } : { category: 0 }
    );
    res.json(crops);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_crop = async (req, res) => {
  const { name, categoryId, category = 0 } = req.body;
  try {
    const crop_doc = await Crop.create({
      name,
      category,
      categoryId,
    });
    res.json(crop_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.edit_crop = async (req, res) => {
  const { name, crop_id } = req.body;
  try {
    const crop_doc = await Crop.findByIdAndUpdate(
      crop_id,
      {
        name,
      },
      { new: true, runValidators: true }
    );
    res.json(crop_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_crop = async (req, res) => {
  const { crop_id } = req.body;
  try {
    const crop_doc = await Crop.findByIdAndDelete(crop_id);
    res.json(crop_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
