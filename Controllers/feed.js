const Feed = require("../Models/feed");

const handleErrors = (err) => {
  let errors = {};
  if (err.code === 11000) {
    errors.name = "Feed already exists!";
    return errors;
  }
  return err;
};

module.exports.get_all_feed = async (req, res) => {
  // const { language, country } = req.query;
  try {
    const feed = await Feed.find({});
    res.json(feed);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.get_feed = async (req, res) => {
  const { language, country } = req.query;
  try {
    const feed = await Feed.aggregate([
      { $match: { country: country.toLowerCase() } },
      {
        $project: {
          name: `$name.${language}`,
          country: 1,
          status: 1,
        },
      },
    ]);
    res.json(feed);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_feed = async (req, res) => {
  const { country, name } = req.body;
  const { user } = res.locals;
  try {
    // if (user) {
    const feed = await Feed.create({
      country,
      name,
      status: 1,
    });
    res.json(feed);
    // } else {
    //   res.status(401).json({ message: "Unauthorized!" });
    // }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.edit_feed = async (req, res) => {
  const { country, name, feed_id } = req.body;
  const { user } = res.locals;
  try {
    // if (user) {
    const updatedFeed = await Feed.findByIdAndUpdate(feed_id, {
      country,
      name,
    });
    res.json(updatedFeed);
    // } else {
    //   res.status(401).json({ message: "Unauthorized!" });
    // }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_feed = async (req, res) => {
  const { feed_id } = req.params;
  const { user } = res.locals;
  try {
    // if (user) {
    const deletedFeed = await Feed.findByIdAndDelete(feed_id);
    res.json(deletedFeed);
    // } else {
    //   res.status(401).json({ message: "Unauthorized!" });
    // }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
