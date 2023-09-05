const SellingChannel = require("../Models/sellingChannel");
const SellinChannelMethod = require("../Models/sellingChannelMethod");
const mongoose = require("mongoose");

const handleErrors = (err) => {
  let errors = {};
  return err;
};

module.exports.get_selling_channel = async (req, res) => {
  const { user } = res.locals;

  try {
    const selling_channel_doc = await SellingChannel.findOne({
      user_id: user._id,
    });
    // console.log(cultivation_doc);
    res.json(selling_channel_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_selling_channel = async (req, res) => {
  const { selling_channel_methods } = req.body;
  const { user } = res.locals;

  try {
    // if (parseInt(season) <= parseInt(cultivation_type)) {
    const selling_channel_doc = await SellingChannel.create({
      user_id: user._id,
      selling_channel_methods,
    });
    res.json(selling_channel_doc);
    // } else {
    //   res.status(400).json({
    //     message: `Season ${season} is not valid for type ${cultivation_type} cultivation`,
    //   });
    // }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.update_selling_channel = async (req, res) => {
  const { selling_channel_id, selling_channel_methods } = req.body;

  try {
    const selling_channel_doc = await SellingChannel.findByIdAndUpdate(
      selling_channel_id,
      {
        selling_channel_methods,
      },
      { runValidators: true, new: true }
    );
    res.json(selling_channel_doc);
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_selling_channel = async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await SellingChannel.findByIdAndDelete(id);
    if (doc) {
      res.json({ message: "Selling Channel deleted!" });
    } else {
      res.status(400).json({ message: "Something went wrong!" });
    }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
