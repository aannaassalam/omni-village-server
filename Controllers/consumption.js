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
          from: "consumption_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "consumption_crop",
        },
      },
      { $unwind: { path: "$consumption_crop" } },
      // { $unwind: { path: "$cultivation_crop" } },
      {
        $project: { __v: 0, "consumption_crop.__v": 0 },
      },
    ]);
    // console.log(cultivation_doc);
    res.json(consumption_doc);
  } catch (err) {
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
  } = req.body;
  const { user } = res.locals;

  try {
    // if (parseInt(season) <= parseInt(cultivation_type)) {
    const consumption_doc = await Consumption.create({
      user_id: user._id,
      consumption_crop_id,
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
  const consumptions = await Consumption.aggregate([
    {
      $lookup: {
        from: "consumption_crops",
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
        from: "users",
        localField: "user_id",
        foreignField: "_id",
        as: "user",
      },
    },

    {
      $unwind: {
        path: "$user",
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);
  const processed_consumptions = {};
  consumptions.forEach((consumption) => {
    const date = moment(consumption.createdAt).format("LL");
    processed_consumptions[date] = processed_consumptions[date]
      ? [...processed_consumptions[date], consumption]
      : [consumption];
  });
  // res.json(consumptions);

  res.render("consumptions", {
    consumptions: processed_consumptions,
  });
};
