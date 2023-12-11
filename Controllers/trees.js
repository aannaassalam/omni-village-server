const Trees = require("../Models/trees");
const TreeProducts = require("../Models/treeProducts");
const TreeCrop = require("../Models/treeCrop");
const mongoose = require("mongoose");
const Logger = require("../Logger");
const moment = require("moment");

const handleErrors = (err) => {
  let errors = {};
  return err;
};

module.exports.get_trees = async (req, res) => {
  const { language } = req.query;
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
      {
        $addFields: {
          "tree_crop.name": `$tree_crop.name.${language}`,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);
    // console.log(cultivation_doc);
    res.json(trees_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.get_all_trees = async (req, res) => {
  try {
    const tree_doc = await Trees.aggregate([
      {
        $lookup: {
          from: "tree_crops",
          localField: "crop_id",
          foreignField: "_id",
          as: "crop",
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
      { $unwind: { path: "$crop" } },
      { $unwind: { path: "$user" } },
      {
        $project: {
          __v: 0,
          "crop.__v": 0,
        },
      },
    ]);
    res.json(tree_doc);
  } catch (err) {
    console.log(err);
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
  // Logger.info(JSON.stringify(req.body));
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
    // Logger.error(err);
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
    const processed_products = []; // All products send via api after adding new ones

    for await (const item of products) {
      if (item._id) {
        processed_products.push(item);
      } else {
        const new_product = await TreeProducts.create({
          ...item,
          tree_crop_id: current_tree.tree_crop_id,
        });
        processed_products.push(new_product);
      }
    }

    const all_products = await TreeProducts.find({
      _id: { $in: processed_products.map((p) => p._id) },
    }); // All products from products field in body

    const updated_products = await Promise.all(
      processed_products.map(async (product) => {
        const current_product = all_products.find(
          (p) => p._id.toString() === product._id.toString()
        );

        var updated_product;

        if (current_product) {
          updated_product = await TreeProducts.findByIdAndUpdate(
            product._id,
            product
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
  const { id } = req.params;
  try {
    const doc = await Trees.findByIdAndDelete(id);
    if (doc?.products.length > 0) {
      for (const product of doc.products) {
        await TreeProducts.findByIdAndDelete(product);
      }
    }
    // console.log(doc, "doc");
    if (doc) {
      res.json({ message: "Trees deleted!" });
    } else {
      res.status(400).json({ message: "Something went wrong!" });
    }
  } catch (err) {
    console.log(err, "err");
    res.status(400).json(err);
  }
};

module.exports.tree_list = async (req, res) => {
  const trees = await Trees.aggregate([
    {
      $lookup: {
        from: "tree_crops",
        localField: "tree_crop_id",
        foreignField: "_id",
        as: "tree_crop",
      },
    },
    {
      $unwind: {
        path: "$tree_crop",
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
  // const processed_trees = {};
  // trees.forEach((tree) => {
  //   const date = moment(tree.createdAt).format("LL");
  //   processed_trees[date] = processed_trees[date]
  //     ? [...processed_trees[date], tree]
  //     : [tree];
  // });
  res.json(trees);

  // res.render("trees", {
  //   trees: processed_trees,
  // });
};
