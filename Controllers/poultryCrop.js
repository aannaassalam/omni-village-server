const PoultryCrop = require("../Models/poultryCrop");

const handleErrors = (err) => {
  let errors = {};
  if (err.code === 11000) {
    errors.name = "Live stock already exists!";
    return errors;
  }
  return err;
};

module.exports.get_poultry_crop = async (req, res) => {
  const { language, country } = req.body;
  try {
    const poultry = await PoultryCrop.aggregate([
      { $match: { country: country.toLowerCase() } },
      {
        $project: {
          name: `$name.${language}`,
          country: 1,
          status: 1,
          label: 1,
        },
      },
    ]);
    res.json(poultry);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_poultry_crop = async (req, res) => {
  const { name } = req.body;
  try {
    const poultry_doc = await PoultryCrop.create({
      name,
    });
    res.json(poultry_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.edit_poultry_crop = async (req, res) => {
  const { name, poultry_crop_id } = req.body;
  try {
    const poultry_doc = await PoultryCrop.findByIdAndUpdate(
      poultry_crop_id,
      {
        name,
      },
      { new: true, runValidators: true }
    );
    res.json(poultry_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_poultry_crop = async (req, res) => {
  const { id } = req.params;
  try {
    const poultry_doc = await PoultryCrop.findByIdAndDelete(id);
    res.json(poultry_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
