const ConsumptionCrop = require("../Models/consumptionCrop");

const handleErrors = (err) => {
  let errors = {};
  if (err.code === 11000) {
    errors.name = "Consumption Crop already exists!";
    return errors;
  }
  return err;
};

module.exports.get_consumption_crop = async (req, res) => {
  const {consumption_type_id}=req.params
  try {
    const consumption_crop_categories = await ConsumptionCrop.find({ category: true,consumption_type_id });
    const consumption_crops = await ConsumptionCrop.find({category:false, consumption_type_id})
    res.json({
      categories: consumption_crop_categories,
      crops: consumption_crops
    });
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_consumption_crop = async (req, res) => {
  const { name, categoryId, category = false, consumption_type_id } = req.body;
  try {
    const consumption_crop_doc = await ConsumptionCrop.create({
      name,
      category,
      categoryId,
      consumption_type_id
    });
    res.json(consumption_crop_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.edit_consumption_crop = async (req, res) => {
  const { name, consumption_crop_id } = req.body;
  try {
    const consumption_crop_doc = await ConsumptionCrop.findByIdAndUpdate(
      consumption_crop_id,
      {
        name,
      },
      { new: true, runValidators: true }
    );
    res.json(consumption_crop_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_consumption_crop = async (req, res) => {
  const { id } = req.params;
  try {
    const consumption_crop_doc = await Crop.findByIdAndDelete(id);
    res.json(consumption_crop_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
