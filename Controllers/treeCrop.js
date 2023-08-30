const TreeCrop = require("../Models/treeCrop");

const handleErrors = (err) => {
  let errors = {};
  if (err.code === 11000) {
    errors.name = "Crop already exists!";
    return errors;
  }
  return err;
};

module.exports.get_tree_crop = async (req, res) => {
  try {
    const crops = await TreeCrop.find();
    res.json(crops);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_tree_crop = async (req, res) => {
  const { name } = req.body;
  try {
    const crop_doc = await TreeCrop.create({
      name,
    });
    res.json(crop_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.edit_tree_crop = async (req, res) => {
  const { name, tree_crop_id } = req.body;
  try {
    const crop_doc = await TreeCrop.findByIdAndUpdate(
      tree_crop_id,
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

module.exports.delete_tree_crop = async (req, res) => {
  const { tree_crop_id } = req.body;
  try {
    const crop_doc = await TreeCrop.findByIdAndDelete(tree_crop_id);
    res.json(crop_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
