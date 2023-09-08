const Feed = require("../Models/feed");

const handleErrors = (err) => {
  let errors = {};
  if (err.code === 11000) {
    errors.name = "Feed already exists!";
    return errors;
  }
  return err;
};

module.exports.get_feed = async (req, res) => {
  try {
    const feed = await Feed.find();
    res.json(feed);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
