const FishFeed = require("../Models/fishFeed");

const handleErrors = (err) => {
  let errors = {};
  if (err.code === 11000) {
    errors.name = "Fish Feed already exists!";
    return errors;
  }
  return err;
};

module.exports.get_fish_feed = async (req, res) => {
  try {
    const feed = await FishFeed.find();
    res.json(feed);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
