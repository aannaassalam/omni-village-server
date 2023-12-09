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
  const { language, country } = req.body;
  try {
    const feed = await Feed.aggregate([
      { $match: { country: country.toLowerCase() } },
      {
        $project: {
          name: `$name.${language}`,
          country: 1,
          status: 1,
          label: 1,
        },
      },
    ]);
    res.json(feed);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
