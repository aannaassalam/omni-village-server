const Villages = require("../Models/villages");

const handleErrors = (err) => {
  let errors = {};
  if (err.code === 11000) {
    errors.name = "Village already exists!";
    return errors;
  }
  return err;
};

module.exports.get_villages = async (req, res) => {
  const { country_name } = req.params;
  const { user } = res.locals;
  try {
    const villages = await Villages.find({
      country: user?.country?.toLowerCase() || country_name.toLowerCase(),
    });
    res.json(villages);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.get_all_villages = async (req, res) => {
  try {
    const villages = await Villages.find({});
    res.json(villages);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_village = async (req, res) => {
  const { country, name } = req.body;
  const { user } = res.locals;
  try {
    // if (user) {
    const village = await Villages.create({
      country,
      name,
    });
    res.json(village);
    // } else {
    //   res.status(401).json({ message: "Unauthorized!" });
    // }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.edit_village = async (req, res) => {
  const { country, name, village_id } = req.body;
  const { user } = res.locals;
  try {
    // if (user) {
    const updatedVillage = await Villages.findByIdAndUpdate(village_id, {
      country,
      name,
    });
    res.json(updatedVillage);
    // } else {
    //   res.status(401).json({ message: "Unauthorized!" });
    // }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_village = async (req, res) => {
  const { village_id } = req.params;
  const { user } = res.locals;
  try {
    // if (user) {
    const deletedVillage = await Villages.findByIdAndDelete(village_id);
    res.json(deletedVillage);
    // } else {
    //   res.status(401).json({ message: "Unauthorized!" });
    // }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
