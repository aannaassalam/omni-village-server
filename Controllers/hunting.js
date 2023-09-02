const Hunting = require("../Models/hunting");
const HuntingCrop = require("../Models/huntingCrop");
const mongoose = require("mongoose");

const handleErrors = (err) => {
  let errors = {};
  return err;
};

module.exports.get_hunting = async (req, res) => {
  const { user } = res.locals;

  try {
    const hunting_doc = await Hunting.aggregate([
      {
        $match: {
          user_id: user._id,
        },
      },
      {
        $lookup: {
          from: "hunting_crops",
          localField: "hunting_crop_id",
          foreignField: "_id",
          as: "hunting_crop",
        },
      },
      { $unwind: { path: "$hunting_crop" } },
      // { $unwind: { path: "$cultivation_crop" } },
      {
        $project: { __v: 0, "hunting_crop.__v": 0 },
      },
    ]);
    // console.log(cultivation_doc);
    res.json(hunting_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_hunting = async (req, res) => {
  const {
    hunting_crop_id,
    number_hunted,
    meat,
    self_consumed,
    sold_to_neighbours,
    sold_in_consumer_market,
    weight_measurement = "kg",
    wastage,
    other,
    other_value,
    income_from_sale,
    expenditure_on_inputs,
    yeild,
    processing_method,
    status = 1,
  } = req.body;
  const { user } = res.locals;

  try {
    // if (parseInt(season) <= parseInt(cultivation_type)) {
    const hunting_doc = await Hunting.create({
      user_id: user._id,
      hunting_crop_id,
      number_hunted,
      meat,
      self_consumed,
      sold_to_neighbours,
      sold_in_consumer_market,
      weight_measurement,
      wastage,
      other,
      other_value,
      income_from_sale,
      expenditure_on_inputs,
      yeild,
      processing_method,
      status,
    });
    res.json(hunting_doc);
    // } else {
    //   res.status(400).json({
    //     message: `Season ${season} is not valid for type ${cultivation_type} cultivation`,
    //   });
    // }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.update_hunting = async (req, res) => {
  const {
    hunting_id,
    number_hunted,
    meat,
    self_consumed,
    sold_to_neighbours,
    sold_in_consumer_market,
    weight_measurement = "kg",
    wastage,
    other,
    other_value,
    income_from_sale,
    expenditure_on_inputs,
    yeild,
    processing_method,
    status = 1,
  } = req.body;

  try {
    const hunting_doc = await Hunting.findByIdAndUpdate(
      hunting_id,
      {
        number_hunted,
        meat,
        self_consumed,
        sold_to_neighbours,
        sold_in_consumer_market,
        weight_measurement,
        wastage,
        other,
        other_value,
        income_from_sale,
        expenditure_on_inputs,
        yeild,
        processing_method,
        status,
      },
      { runValidators: true, new: true }
    );
    res.json(hunting_doc);
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_hunting = async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await Hunting.findByIdAndDelete(id);
    if (doc) {
      res.json({ message: "Hunting deleted!" });
    } else {
      res.status(400).json({ message: "Something went wrong!" });
    }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
