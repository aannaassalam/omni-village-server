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
    const consumption_type = await ConsumptionType.aggregate([
        {
            $addFields: {
                name: `$name.${language}`,
            },
        },
    ]);
    return res.json(consumption_type);
};

module.exports.add_consumption_type = async (req, res) => {
    const { name } = req.body;
    const consumption_type_doc = await ConsumptionType.create({
        name,
    });
    return res.json(consumption_type_doc);
};

module.exports.edit_consumption_type = async (req, res) => {
    const { name, consumption_type_id } = req.body;
    const consumption_type_doc = await ConsumptionType.findByIdAndUpdate(
        consumption_type_id,
        {
            name,
        },
        { new: true, runValidators: true }
    );
    return res.json(consumption_type_doc);
};

module.exports.delete_consumption_type = async (req, res) => {
    const { id } = req.params;
    const consumption_type_doc = await ConsumptionType.findByIdAndDelete(id);
    return res.json(consumption_type_doc);
};
