const Poultry = require("../Models/poultry");
const PoultryProducts = require("../Models/poultryProduct");
const PoultryCrop = require("../Models/poultryCrop");
const mongoose = require("mongoose");

const handleErrors = (err) => {
  let errors = {};
  return err;
};

module.exports.get_poultries = async (req, res) => {
  const { user } = res.locals;

  try {
    const poultries_doc = await Poultry.aggregate([
      {
        $match: {
          user_id: user._id,
        },
      },
      {
        $lookup: {
          from: "poultry_crops",
          localField: "poultry_crop_id",
          foreignField: "_id",
          as: "poultry_crop",
        },
      },
      { $unwind: { path: "$poultry_crop" } },
      {
        $lookup: {
          from: "poultry_products",
          localField: "products",
          foreignField: "_id",
          as: "products",
        },
      },
      // { $unwind: { path: "$cultivation_crop" } },
      {
        $project: { __v: 0, "product_crop.__v": 0, "products.__v": 0 },
      },
    ]);
    // console.log(cultivation_doc);
    res.json(poultries_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_poultries = async (req, res) => {
  const {
    poultry_crop_id,
    number,
    avg_age_of_live_stocks,
    avg_age_time_period,
    type_of_feed,
    other_type_of_feed,
    weight_measurement = "kg",
    personal_information,
    income_from_sale,
    expenditure_on_inputs,
    products,
    steroids,
    status = 1,
  } = req.body;
  const { user } = res.locals;

  try {
    // if (parseInt(season) <= parseInt(cultivation_type)) {
    const poultry_product_docs = await PoultryProducts.insertMany(
      products.map((p) => ({ ...p, poultry_crop_id }))
    );
    const poultry_doc = await Poultry.create({
      user_id: user._id,
      poultry_crop_id,
      number,
      avg_age_of_live_stocks,
      avg_age_time_period,
      type_of_feed,
      other_type_of_feed,
      weight_measurement,
      personal_information,
      income_from_sale,
      steroids,
      products: poultry_product_docs.map((tp) => tp._id),
      expenditure_on_inputs,
      status,
    });
    res.json(poultry_doc);
    // } else {
    //   res.status(400).json({
    //     message: `Season ${season} is not valid for type ${cultivation_type} cultivation`,
    //   });
    // }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.update_poultries = async (req, res) => {
  const {
    poultry_id,
    number,
    avg_age_of_live_stocks,
    avg_age_time_period,
    type_of_feed,
    other_type_of_feed,
    weight_measurement = "kg",
    personal_information,
    income_from_sale,
    expenditure_on_inputs,
    products,
    steroids,
    status = 1,
  } = req.body;

  try {
    const current_poultry = await Poultry.findById(poultry_id);
    const all_products = await PoultryProducts.find({
      _id: { $in: products.map((p) => p._id) },
    });
    const updated_products = await Promise.all(
      all_products.map(async (product) => {
        const current_product = products.find(
          (p) => p._id === product._id.toString()
        );
        var updated_product;
        if (current_product) {
          updated_product = await PoultryProducts.findByIdAndUpdate(
            current_product._id,
            current_product
          );
          return updated_product._id;
        }
      })
    );
    const deleted_products = current_poultry.products.filter((product) => {
      return !all_products
        .map((p) => p._id.toString())
        .includes(product.toString());
    });
    const deleted = deleted_products.forEach(async (item) => {
      await PoultryProducts.findByIdAndDelete(item._id);
    });
    const poultry_doc = await Poultry.findByIdAndUpdate(
      poultry_id,
      {
        number,
        avg_age_of_live_stocks,
        avg_age_time_period,
        type_of_feed,
        other_type_of_feed,
        weight_measurement,
        personal_information,
        income_from_sale,
        expenditure_on_inputs,
        steroids,
        products: updated_products,
        status,
      },
      { runValidators: true, new: true }
    );
    res.json(poultry_doc);
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_poultry = async (req, res) => {
  const { id } = req.body;
  try {
    const doc = await Poultry.findByIdAndDelete(id);
    for (const product of doc.products) {
      await PoultryProducts.findByIdAndDelete(product);
    }
    if (doc) {
      res.json({ message: "Poultry deleted!" });
    } else {
      res.status(400).json({ message: "Something went wrong!" });
    }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
