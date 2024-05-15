const Consumption = require("../Models/consumption");
// const HuntingCrop = require("../Models/huntingCrop");
const mongoose = require("mongoose");
const moment = require("moment");

const handleErrors = (err) => {
  let errors = {};
  return err;
};

module.exports.get_consumption = async (req, res) => {
  const { user } = res.locals;
  const { consumption_type_name } = req.params;
  const { language } = req.query;

  try {
    const consumption_doc = await Consumption.aggregate([
      {
        $match: {
          user_id: user._id,
          consumption_type_name: consumption_type_name.toLowerCase(),
        },
      },
      {
        $lookup: {
          from: "crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "tree_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "tree_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$tree_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "poultry_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "poultry_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$poultry_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "fishery_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "fishery_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$fishery_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "hunting_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "hunting_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$hunting_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "consumptioncrops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "other_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$other_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: { __v: 0, "consumption_crop.__v": 0 },
      },
      {
        $addFields: {
          "consumption_crop.name": `$consumption_crop.name.${language}`,
          "tree_consumption_crop.name": `$tree_consumption_crop.name.${language}`,
          "poultry_consumption_crop.name": `$poultry_consumption_crop.name.${language}`,
          "hunting_consumption_crop.name": `$hunting_consumption_crop.name.${language}`,
          "fishery_consumption_crop.name": `$fishery_consumption_crop.name.${language}`,
          "other_consumption_crop.name": `$other_consumption_crop.name.${language}`,
        },
      },
    ]);
    const new_consumption_docs = consumption_doc.map((_consumption) => {
      if (_consumption.consumption_crop._id) return _consumption;
      else if (_consumption.tree_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.tree_consumption_crop;
      } else if (_consumption.poultry_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.poultry_consumption_crop;
      } else if (_consumption.hunting_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.hunting_consumption_crop;
      } else if (_consumption.fishery_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.fishery_consumption_crop;
      } else if (_consumption.other_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.other_consumption_crop;
      }
      return _consumption;
    });
    res.json(new_consumption_docs);
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_consumption = async (req, res) => {
  const {
    consumption_crop_id,
    total_quantity,
    weight_measurement,
    purchased_from_market,
    purchased_from_neighbours,
    self_grown,
    consumption_type_name,
    status = 1,
    consumption_type_id,
  } = req.body;
  const { user } = res.locals;

  try {
    // if (parseInt(season) <= parseInt(cultivation_type)) {
    const consumption_doc = await Consumption.create({
      user_id: user._id,
      consumption_crop_id,
      consumption_type_id,
      total_quantity,
      consumption_type_name,
      purchased_from_market,
      weight_measurement,
      purchased_from_neighbours,
      self_grown,
      status,
    });
    res.json(consumption_doc);
    // } else {
    //   res.status(400).json({
    //     message: `Season ${season} is not valid for type ${cultivation_type} cultivation`,
    //   });
    // }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.update_consumption = async (req, res) => {
  const {
    consumption_id,
    total_quantity,
    purchased_from_market,
    purchased_from_neighbours,
    weight_measurement,
    self_grown,
    status = 1,
  } = req.body;

  try {
    const consumption_doc = await Consumption.findByIdAndUpdate(
      consumption_id,
      {
        total_quantity,
        weight_measurement,
        purchased_from_market,
        purchased_from_neighbours,
        self_grown,
        status,
      },
      { runValidators: true, new: true }
    );
    res.json(consumption_doc);
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_consumption = async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await Consumption.findByIdAndDelete(id);
    if (doc) {
      res.json({ message: "Consumption deleted!" });
    } else {
      res.status(400).json({
        message: "Something went wrong or the document doesn't exists!",
      });
    }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.consumption_list = async (req, res) => {
  const { consumption_type_id } = req.query;

  try {
    const consumption_docs = await Consumption.aggregate([
      {
        $match: {
          consumption_type_id: new mongoose.Types.ObjectId(consumption_type_id),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "tree_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "tree_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$tree_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "poultry_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "poultry_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$poultry_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "fishery_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "fishery_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$fishery_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "hunting_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "hunting_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$hunting_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "consumptioncrops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "other_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$other_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: { __v: 0, "consumption_crop.__v": 0 },
      },
      {
        $addFields: {
          "consumption_crop.name": `$consumption_crop.name.en`,
          "tree_consumption_crop.name": `$tree_consumption_crop.name.en`,
          "poultry_consumption_crop.name": `$poultry_consumption_crop.name.en`,
          "hunting_consumption_crop.name": `$hunting_consumption_crop.name.en`,
          "fishery_consumption_crop.name": `$fishery_consumption_crop.name.en`,
          "other_consumption_crop.name": `$other_consumption_crop.name.en`,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);
    const new_consumption_docs = consumption_docs.map((_consumption) => {
      if (_consumption.consumption_crop._id) return _consumption;
      else if (_consumption.tree_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.tree_consumption_crop;
      } else if (_consumption.poultry_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.poultry_consumption_crop;
      } else if (_consumption.hunting_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.hunting_consumption_crop;
      } else if (_consumption.fishery_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.fishery_consumption_crop;
      } else if (_consumption.other_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.other_consumption_crop;
      }
      return _consumption;
    });
    res.json(new_consumption_docs);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};
