const FisheryCrop = require("../Models/fisheryCrop");
const csvtojson = require("csvtojson");

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
    res.json(fishery);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.get_all_fishery_crop = async (req, res) => {
  try {
    const fishery = await FisheryCrop.aggregate([
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
    res.json(fishery);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_fishery_crop = async (req, res) => {
  const { name, country, status, label, ideal_consumption_per_person } =
    req.body;
  const { language } = req.query;
  try {
    const fishery_doc = await FisheryCrop.create({
      name: {
        en: name.en,
        ms: name.ms || name.en,
        dz: name.dz || name.en,
      },
      country,
      label,
      status,
      ideal_consumption_per_person,
    });
    res.json({ ...fishery_doc._doc, name: fishery_doc.name[language] });
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.bulk_upload = async (req, res) => {
  const file = req.file.path;
  try {
    const data = await csvtojson().fromFile(file);
    const hoo = await FisheryCrop.insertMany(data, {
      rawResult: true,
    });
    return res.json({
      inserted: hoo.insertedCount,
      failed: data.length - hoo.insertedCount,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        message: `Duplicate Data found in csv file. Data can be found at row number - ${
          err.writeErrors[0].index + 1
        }. Please remove the rows before row ${
          err.writeErrors[0].index + 1
        } along with the duplicate entry.`,
      });
    }
    if (err.name === "ValidationError")
      return res.status(400).json({
        message: err.message,
      });
    return res.status(400).json(err);
  }
};

module.exports.edit_fishery_crop = async (req, res) => {
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
    const fishery_doc = await FisheryCrop.findByIdAndUpdate(
      crop_id,
      {
        name: {
          en: name.en,
          ms: name.ms || name.en,
          dz: name.dz || name.en,
        },
        country,
        label,
        status,
        ideal_consumption_per_person,
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
