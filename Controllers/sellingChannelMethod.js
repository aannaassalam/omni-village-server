const SellingChannelMethod = require("../Models/sellingChannelMethod");

const handleErrors = (err) => {
  let errors = {};
  if (err.code === 11000) {
    errors.name = "Selling Channel method already exists!";
    return errors;
  }
  return err;
};

module.exports.get_selling_channel_method = async (req, res) => {
  try {
    const methods = await SellingChannelMethod.find();
    res.json(methods);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_selling_channel_method = async (req, res) => {
  const { name } = req.body;
  try {
    const method_doc = await SellingChannelMethod.create({
      name,
    });
    res.json(method_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.edit_selling_channel_method = async (req, res) => {
  const { name, selling_channel_method_id } = req.body;
  try {
    const method_doc = await SellingChannelMethod.findByIdAndUpdate(
      selling_channel_method_id,
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

module.exports.delete_selling_channel_method = async (req, res) => {
  const { id } = req.params;
  try {
    const method_doc = await SellingChannelMethod.findByIdAndDelete(id);
    res.json(method_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
