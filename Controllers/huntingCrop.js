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
  const { language, country } = req.query;
  try {
    const hunting = await HuntingCrop.aggregate([
      { $match: { country: country.toLowerCase() } },
      {
        $lookup: {
          from: "consumption_type",
          localField: "label",
          foreignField: "_id",
          as: "label",
        },
      },
      { $unwind: { path: "$label", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: `$name.${language}`,
          country: 1,
          status: 1,
          label: 1,
        },
      },
    ]);
    res.json(hunting);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.get_all_hunting_crop = async (req, res) => {
  try {
    const hunting = await HuntingCrop.aggregate([
      {
        $lookup: {
          from: "consumption_types",
          localField: "label",
          foreignField: "_id",
          as: "label",
        },
      },
      {
        $unwind: {
          path: "$label",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    res.json(hunting);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_hunting_crop = async (req, res) => {
  const { name, country, status, label, ideal_consumption_per_person } =
    req.body;
  const { language } = req.query;
  try {
    const hunting_doc = await HuntingCrop.create({
      name: {
        en: name.en,
        ms: name.ms || name.en,
      },
      country,
      label,
      status,
      ideal_consumption_per_person,
    });
    res.json({ ...hunting_doc._doc, name: hunting_doc.name[language] });
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.edit_hunting_crop = async (req, res) => {
  const {
    name,
    country,
    status,
    label,
    crop_id,
    ideal_consumption_per_person,
  } = req.body;
  const { language } = req.query;
  try {
    const hunting_doc = await HuntingCrop.findByIdAndUpdate(
      crop_id,
      {
        name: {
          en: name.en,
          ms: name.ms || name.en,
        },
        country,
        label,
        status,
        ideal_consumption_per_person,
      },
      { new: true, runValidators: true }
    );
    res.json({ ...hunting_doc._doc, name: hunting_doc.name[language] });
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_hunting_crop = async (req, res) => {
  const { id } = req.params;
  try {
    const hunting_doc = await HuntingCrop.findByIdAndDelete(id);
    res.json(hunting_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
