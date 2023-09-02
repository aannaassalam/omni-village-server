const Storage = require("../Models/storage");
const StorageMethod = require("../Models/storageMethod");
const mongoose = require("mongoose");

const handleErrors = (err) => {
  let errors = {};
  return err;
};

module.exports.get_storage = async (req, res) => {
  const { user } = res.locals;

  try {
    const storage_doc = await Storage.aggregate([
      {
        $match: {
          user_id: user._id,
        },
      },
      {
        $lookup: {
          from: "storage_methods",
          localField: "storage_method_id",
          foreignField: "_id",
          as: "storage_method",
        },
      },
      { $unwind: { path: "$storage_method" } },
      // { $unwind: { path: "$cultivation_crop" } },
      {
        $project: { __v: 0, "storage_method.__v": 0 },
      },
    ]);
    // console.log(cultivation_doc);
    res.json(storage_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_storage = async (req, res) => {
  const { stock_name, storage_method_id, stock_quantity } = req.body;
  const { user } = res.locals;

  try {
    // if (parseInt(season) <= parseInt(cultivation_type)) {
    const storage_doc = await Storage.create({
      user_id: user._id,
      stock_name,
      storage_method_id,
      stock_quantity,
    });
    res.json(storage_doc);
    // } else {
    //   res.status(400).json({
    //     message: `Season ${season} is not valid for type ${cultivation_type} cultivation`,
    //   });
    // }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.update_storage = async (req, res) => {
  const { storage_id, storage_method_id, stock_quantity } = req.body;

  try {
    const storage_doc = await Storage.findByIdAndUpdate(
      storage_id,
      {
        storage_method_id,
        stock_quantity,
      },
      { runValidators: true, new: true }
    );
    res.json(storage_doc);
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_storage = async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await Storage.findByIdAndDelete(id);
    if (doc) {
      res.json({ message: "Storage deleted!" });
    } else {
      res.status(400).json({ message: "Something went wrong!" });
    }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
