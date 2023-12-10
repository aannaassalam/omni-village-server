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
  const { language, country } = req.query;
  try {
    const fishery = await FisheryCrop.aggregate([
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
    res.json(fishery);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_fishery_crop = async (req, res) => {
  const { name, country, status, label } = req.body;
  const { language } = req.query;
  try {
    const fishery_doc = await FisheryCrop.create({
      name: {
        en: name.en,
        ms: name.ms || name.en,
      },
      country: typeof country === "string" ? [country] : country,
      label,
      status,
    });
    res.json({ ...fishery_doc._doc, name: fishery_doc.name[language] });
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.edit_fishery_crop = async (req, res) => {
  const { name, country, status, label, fishery_crop_id } = req.body;
  const { language } = req.query;
  try {
    const fishery_doc = await FisheryCrop.findByIdAndUpdate(
      fishery_crop_id,
      {
        name: {
          en: name.en,
          ms: name.ms || name.en,
        },
        country,
        label,
        status,
      },
      { new: true, runValidators: true }
    );
    res.json({ ...fishery_doc._doc, name: fishery_doc.name[language] });
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
