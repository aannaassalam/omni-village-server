const Poultry = require("../Models/poultry");
const PoultryProducts = require("../Models/poultryProduct");
const PoultryCrop = require("../Models/poultryCrop");
const mongoose = require("mongoose");
const moment = require("moment");

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
    const processed_products = []; // All products send via api after adding new ones

    for await (const item of products) {
      if (item._id) {
        processed_products.push(item);
      } else {
        const new_product = await PoultryProducts.create({
          ...item,
          poultry_crop_id: current_poultry.poultry_crop_id,
        });
        processed_products.push(new_product);
      }
    }

    // console.log(processed_products);

    const all_products = await PoultryProducts.find({
      _id: { $in: processed_products.map((p) => p._id) },
    }); // All products from products field in body

    const updated_products = await Promise.all(
      processed_products.map(async (product) => {
        const current_product = all_products.find(
          (p) => p._id.toString() === product._id.toString()
        );

        var updated_product;

        if (current_product) {
          updated_product = await PoultryProducts.findByIdAndUpdate(
            product._id,
            product
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
  const { id } = req.params;
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

module.exports.poultry_list = async (req, res) => {
  const poultries = await Poultry.aggregate([
    {
      $lookup: {
        from: "poultry_crop",
        localField: "poultry_crop_id",
        foreignField: "_id",
        as: "poultry_crop",
      },
    },
    {
      $unwind: {
        path: "$poultry_crop",
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
  const processed_poultries = {};
  poultries.forEach((poultry) => {
    const date = moment(poultry.createdAt).format("LL");
    processed_poultries[date] = processed_poultries[date]
      ? [...processed_poultries[date], poultry]
      : [poultry];
  });
  // res.json(processed_poultries);

  res.render("poultries", {
    poultries: processed_poultries,
  });
};
