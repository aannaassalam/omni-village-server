const Storage = require("../Models/storage");
const StorageMethod = require("../Models/storageMethod");
const mongoose = require("mongoose");

const handleErrors = (err) => {
  let errors = {};
  return err;
};

module.exports.get_storage = async (req, res) => {
  const { user } = res.locals;
  // console.log(user._id);
  try {
    const storage_doc = await Storage.find(
      {
        user_id: user._id,
      }
      // {
      //   $lookup: {
      //     from: "storage_methods",
      //     localField: "storage_method_id",
      //     foreignField: "_id",
      //     as: "storage_method",
      //   },
      // },
      // { $unwind: { path: "$storage_method" } },
      // // { $unwind: { path: "$cultivation_crop" } },
      // {
      //   $project: { __v: 0, "storage_method.__v": 0 },
      // },
    );
    // console.log(storage_doc);
    res.json(storage_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_storage = async (req, res) => {
  const { storages } = req.body;
  const { user } = res.locals;

  try {
    const storage_docs = [];
    // if (parseInt(season) <= parseInt(cultivation_type)) {
    for await (const storage of storages) {
      // console.log(storage);
      const storage_doc = await Storage.create({
        user_id: user._id,
        stock_name: storage.stock_name,
        storage_method_name: storage.storage_method_name,
        stock_quantity: storage.stock_quantity,
      });
      storage_docs.push(storage_doc);
    }
    res.json(storage_docs);
    // } else {
    //   res.status(400).json({
    //     message: `Season ${season} is not valid for type ${cultivation_type} cultivation`,
    //   });
    // }
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.update_storage = async (req, res) => {
  const { storages } = req.body;

  try {
    const storage_docs = [];
    for await (const storage of storages) {
      const storage_doc = await Storage.findByIdAndUpdate(
        storage.storage_id,
        {
          storage_method_name: storage.storage_method_name,
          stock_quantity: storage.stock_quantity,
        },
        { runValidators: true, new: true }
      );
      storage_docs.push(storage_doc);
    }

    res.json(storage_docs);
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
