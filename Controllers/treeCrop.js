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
  const { language, country } = req.query;
  try {
    const tree_crops = await TreeCrop.aggregate([
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
    res.json(tree_crops);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.get_all_tree_crop = async (req, res) => {
  try {
    const crops = await TreeCrop.aggregate([
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

module.exports.add_tree_crop = async (req, res) => {
  const { name, country, status, label } = req.body;
  const { language } = req.query;
  try {
    const crop_doc = await TreeCrop.create({
      name: {
        en: name.en,
        ms: name.ms || name.en,
      },
      country,
      label,
      status,
    });
    res.json({ ...crop_doc._doc, name: crop_doc.name[language] });
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.edit_tree_crop = async (req, res) => {
  const { name, country, status, label, crop_id } = req.body;
  const { language } = req.query;
  try {
    const crop_doc = await TreeCrop.findByIdAndUpdate(
      crop_id,
      {
        name: {
          en: name.en,
          ms: name.ms || name.en,
        },
        label,
        country,
        status,
      },
      { new: true, runValidators: true }
    );
    res.json({ ...crop_doc._doc, name: crop_doc.name[language] });
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_tree_crop = async (req, res) => {
  const { id } = req.params;
  try {
    const crop_doc = await TreeCrop.findByIdAndDelete(id);
    res.json(crop_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
