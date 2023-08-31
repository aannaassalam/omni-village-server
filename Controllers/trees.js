const Trees = require("../Models/trees");
const TreeProducts = require("../Models/treeProducts");
const TreeCrop = require("../Models/treeCrop");
const mongoose = require("mongoose");

const handleErrors = (err) => {
  let errors = {};
  return err;
};

module.exports.get_trees = async (req, res) => {
  const { user } = res.locals;

  try {
    const trees_doc = await Trees.aggregate([
      {
        $match: {
          user_id: user._id,
        },
      },
      {
        $lookup: {
          from: "tree_crops",
          localField: "tree_crop_id",
          foreignField: "_id",
          as: "tree_crop",
        },
      },
      { $unwind: { path: "$tree_crop" } },
      {
        $lookup: {
          from: "tree_products",
          localField: "products",
          foreignField: "_id",
          as: "products",
        },
      },
      // { $unwind: { path: "$cultivation_crop" } },
      {
        $project: { __v: 0, "tree_crop.__v": 0, "products.__v": 0 },
      },
    ]);
    // console.log(cultivation_doc);
    res.json(trees_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_trees = async (req, res) => {
  const {
    tree_crop_id,
    number_of_trees,
    avg_age_of_trees,
    soil_health,
    decreasing_rate,
    type_of_fertilizer_used,
    type_of_pesticide_used,
    income_from_sale,
    expenditure_on_inputs,
    products,
    status = 1,
  } = req.body;
  const { user } = res.locals;

  try {
    // if (parseInt(season) <= parseInt(cultivation_type)) {
    const tree_product_docs = await TreeProducts.insertMany(
      products.map((p) => ({ ...p, tree_crop_id }))
    );
    const tree_doc = await Trees.create({
      user_id: user._id,
      tree_crop_id,
      number_of_trees,
      avg_age_of_trees,
      soil_health,
      decreasing_rate,
      type_of_fertilizer_used,
      type_of_pesticide_used,
      income_from_sale,
      products: tree_product_docs.map((tp) => tp._id),
      expenditure_on_inputs,
      status,
    });
    res.json(tree_doc);
    // } else {
    //   res.status(400).json({
    //     message: `Season ${season} is not valid for type ${cultivation_type} cultivation`,
    //   });
    // }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.update_trees = async (req, res) => {
  const {
    tree_id,
    number_of_trees,
    avg_age_of_trees,
    soil_health,
    decreasing_rate,
    type_of_fertilizer_used,
    type_of_pesticide_used,
    income_from_sale,
    expenditure_on_inputs,
    products,
    status = 1,
  } = req.body;

  try {
    const current_tree = await Trees.findById(tree_id);
    const all_products = await TreeProducts.find({
      _id: { $in: products.map((p) => p._id) },
    });
    console.log(all_products, "all_products");
    const updated_products = await Promise.all(
      all_products.map(async (product) => {
        const current_product = products.find(
          (p) => p._id === product._id.toString()
        );
        var updated_product;
        if (current_product) {
          updated_product = await TreeProducts.findByIdAndUpdate(
            current_product._id,
            current_product
          );
          return updated_product._id;
        }
      })
    );
    const deleted_products = current_tree.products.filter((product) => {
      return !all_products
        .map((p) => p._id.toString())
        .includes(product.toString());
    });
    const deleted = deleted_products.forEach(async (item) => {
      await TreeProducts.findByIdAndDelete(item._id);
    });
    const cultivation_doc = await Trees.findByIdAndUpdate(
      tree_id,
      {
        number_of_trees,
        avg_age_of_trees,
        soil_health,
        decreasing_rate,
        type_of_fertilizer_used,
        type_of_pesticide_used,
        income_from_sale,
        expenditure_on_inputs,
        products: updated_products,
        status,
      },
      { runValidators: true, new: true }
    );
    res.json(cultivation_doc);
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_tree = async (req, res) => {
  const { id } = req.body;
  try {
    const doc = await Trees.findByIdAndDelete(id);
    for (const product of doc.products) {
      await TreeProducts.findByIdAndDelete(product);
    }
    if (doc) {
      res.json({ message: "Cultivation deleted!" });
    } else {
      res.status(400).json({ message: "Something went wrong!" });
    }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
