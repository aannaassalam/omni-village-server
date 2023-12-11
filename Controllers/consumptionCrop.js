const crop = require("../Models/crop");
const fisheryCrop = require("../Models/fisheryCrop");
const poultryCrop = require("../Models/poultryCrop");
const huntingCrop = require("../Models/huntingCrop");
const treesCrop = require("../Models/treeCrop");

const handleErrors = (err) => {
  let errors = {};
  if (err.code === 11000) {
    errors.name = "Consumption Crop already exists!";
    return errors;
  }
  return err;
};

module.exports.get_consumption_crop = async (req, res) => {
  const { consumption_type_id } = req.params;
  const { language, country } = req.query;
  try {
    const consumption_crops = await Promise.all([
      await crop.find(
        { label: consumption_type_id, country: country.toLowerCase() },
        { name: `$name.${language}`, country: 1, status: 1, label: 1 }
      ),
      await treesCrop.find(
        { label: consumption_type_id, country: country.toLowerCase() },
        { name: `$name.${language}`, country: 1, status: 1, label: 1 }
      ),
      await poultryCrop.find(
        { label: consumption_type_id, country: country.toLowerCase() },
        { name: `$name.${language}`, country: 1, status: 1, label: 1 }
      ),
      await huntingCrop.find(
        { label: consumption_type_id, country: country.toLowerCase() },
        { name: `$name.${language}`, country: 1, status: 1, label: 1 }
      ),
      await fisheryCrop.find(
        { label: consumption_type_id, country: country.toLowerCase() },
        { name: `$name.${language}`, country: 1, status: 1, label: 1 }
      ),
    ]);
    res.json(consumption_crops.flat());
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
