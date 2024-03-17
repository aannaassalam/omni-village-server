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
  const { language, country } = req.query;
  try {
    const crops = await Crop.aggregate([
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
          // "label.name": "$label.name.en",
        },
      },
    ]);
    res.json(crops);
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.get_all = async (req, res) => {
  const { language } = req.query;
  try {
    const crops = await Crop.aggregate([
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
    res.json(crops);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_crop = async (req, res) => {
  const { name, country, status, label, ideal_consumption_per_person } =
    req.body;
  const { language } = req.query;
  try {
    const crop_doc = await Crop.create({
      name: {
        en: name.en,
        ms: name.ms || name.en,
      },
      country,
      label,
      status,
      ideal_consumption_per_person,
    });
    res.json({ ...crop_doc._doc, name: crop_doc.name[language] });
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.edit_crop = async (req, res) => {
  const {
    name,
    crop_id,
    country,
    status,
    label,
    ideal_consumption_per_person,
  } = req.body;
  const { language } = req.query;
  try {
    const crop_doc = await Crop.findByIdAndUpdate(
      crop_id,
      {
        name: {
          en: name.en,
          ms: name.ms || name.en,
        },
        label,
        country,
        status,
        ideal_consumption_per_person,
      },
      { new: true, runValidators: true }
    );
    res.json({ ...crop_doc._doc, name: crop_doc.name[language] });
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_crop = async (req, res) => {
  const { id } = req.params;
  try {
    const crop_doc = await Crop.findByIdAndDelete(id);
    res.json(crop_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
