const Cultivation = require("../Models/cultivation");
const Crop = require("../Models/crop");

const handleErrors = (err) => {
  let errors = {};
  return err;
};

module.exports.get_cultivation = async (req, res) => {
  const { season, crop_id, cultivation_type } = req.body;
  const { user } = res.locals;

  try {
    const cultivation_doc = await Cultivation.findOne({
      season,
      crop_id,
      user_id: user._id,
      cultivation_type,
    });
    res.json(cultivation_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_cultivation = async (req, res) => {
  const {
    season,
    cultivation_type,
    crop_id,
    area_allocated,
    output,
    weight_measurement,
    ultilization,
    important_information,
  } = req.body;
  const { user } = res.locals;

  try {
    if (parseInt(season) <= parseInt(cultivation_type)) {
      const cultivation_doc = await Cultivation.create({
        season,
        cultivation_type,
        crop_id,
        user_id: user._id,
        area_allocated,
        output,
        weight_measurement,
        ultilization,
        important_information,
      });
      res.json(cultivation_doc);
    } else {
      res.status(400).json({
        message: `Season ${season} is not valid for type ${cultivation_type} cultivation`,
      });
    }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.update_cultivation = async (req, res) => {
  const {
    cultivation_id,
    area_allocated,
    output,
    weight_measurement,
    ultilization,
    important_information,
  } = req.body;

  try {
    const cultivation_doc = await Cultivation.findByIdAndUpdate(
      cultivation_id,
      {
        area_allocated,
        output,
        weight_measurement,
        ultilization,
        important_information,
      },
      { runValidators: true, new: true }
    );
    res.json(cultivation_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
