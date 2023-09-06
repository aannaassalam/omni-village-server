const Fishery = require("../Models/fishery");
const FisheryCrop = require("../Models/fisheryCrop");
const mongoose = require("mongoose");

const handleErrors = (err) => {
  let errors = {};
  return err;
};

module.exports.get_fishery = async (req, res) => {
  const { fishery_type } = req.params;
  const { user } = res.locals;

  const match_contition =
    fishery_type === "pond" ? { fishery_type: "pond" } : {};

  try {
    const fishery_doc = await Fishery.aggregate([
      {
        $match: {
          user_id: user._id,
          fishery_type,
        },
      },
      {
        $lookup: {
          from: "fishery_crops",
          localField: "fishery_crop_id",
          foreignField: "_id",
          as: "fishery_crop",
        },
      },
      { $unwind: { path: "$fishery_crop" } },
      // { $unwind: { path: "$cultivation_crop" } },
      {
        $project: { __v: 0, "fishery_crop.__v": 0 },
      },
      fishery_type === "river"
        ? {
            $group: {
              _id: "$pond_name",
              result: {
                $push: "$$ROOT",
              },
            },
          }
        : { $group: {} },
    ]);
    // console.log(cultivation_doc);
    res.json(fishery_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_fishery = async (req, res) => {
  const {
    fishery_crop_id,
    fishery_type,
    pond_name,
    important_information,
    production_information,
    processing_method,
    weight_measurement = "kg",
    status = 1,
  } = req.body;
  const { user } = res.locals;

  try {
    // if (parseInt(season) <= parseInt(cultivation_type)) {
    const fishery_doc = await Fishery.create({
      user_id: user._id,
      fishery_crop_id,
      fishery_type,
      pond_name,
      important_information,
      production_information,
      processing_method,
      weight_measurement,
      status,
    });
    res.json(fishery_doc);
    // } else {
    //   res.status(400).json({
    //     message: `Season ${season} is not valid for type ${cultivation_type} cultivation`,
    //   });
    // }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.update_fishery = async (req, res) => {
  const {
    fishery_id,
    fishery_type,
    pond_name,
    important_information,
    production_information,
    processing_method,
    weight_measurement = "kg",
    status = 1,
  } = req.body;

  try {
    const fishery_doc = await Fishery.findByIdAndUpdate(
      fishery_id,
      {
        fishery_type,
        pond_name,
        important_information,
        production_information,
        processing_method,
        weight_measurement,
        status,
      },
      { runValidators: true, new: true }
    );
    res.json(fishery_doc);
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_fishery = async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await Fishery.findByIdAndDelete(id);
    if (doc) {
      res.json({ message: "Fishery deleted!" });
    } else {
      res.status(400).json({ message: "Something went wrong!" });
    }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
