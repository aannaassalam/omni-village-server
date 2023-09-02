const StorageMethod = require("../Models/storageMethod");

const handleErrors = (err) => {
  let errors = {};
  if (err.code === 11000) {
    errors.name = "Storage method already exists!";
    return errors;
  }
  return err;
};

module.exports.get_storage_method = async (req, res) => {
  try {
    const methods = await StorageMethod.find();
    res.json(methods);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_storage_method = async (req, res) => {
  const { name } = req.body;
  try {
    const method_doc = await StorageMethod.create({
      name,
    });
    res.json(method_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.edit_storage_method = async (req, res) => {
  const { name, storage_method_id } = req.body;
  try {
    const method_doc = await StorageMethod.findByIdAndUpdate(
      storage_method_id,
      {
        name,
      },
      { new: true, runValidators: true }
    );
    res.json(method_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_storage_method = async (req, res) => {
  const { id } = req.params;
  try {
    const method_doc = await StorageMethod.findByIdAndDelete(id);
    res.json(method_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
