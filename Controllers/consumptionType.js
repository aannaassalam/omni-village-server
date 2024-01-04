const ConsumptionType = require("../Models/consumptionType");

const handleErrors = (err) => {
  let errors = {};
  if (err.code === 11000) {
    errors.name = "Consumption Type already exists!";
    return errors;
  }
  return err;
};

module.exports.get_consumption_type = async (req, res) => {
  const { language = "en" } = req.query;
  try {
    const consumption_type = await ConsumptionType.aggregate([
      {
        $addFields: {
          name: `$name.${language}`,
        },
      },
    ]);
    res.json(consumption_type);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_consumption_type = async (req, res) => {
  const { name } = req.body;
  try {
    const consumption_type_doc = await ConsumptionType.create({
      name,
    });
    res.json(consumption_type_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.edit_consumption_type = async (req, res) => {
  const { name, consumption_type_id } = req.body;
  try {
    const consumption_type_doc = await ConsumptionType.findByIdAndUpdate(
      consumption_type_id,
      {
        name,
      },
      { new: true, runValidators: true }
    );
    res.json(consumption_type_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_consumption_type = async (req, res) => {
  const { id } = req.params;

  try {
    const consumption_type_doc = await ConsumptionType.findByIdAndDelete(id);
    res.json(consumption_type_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
