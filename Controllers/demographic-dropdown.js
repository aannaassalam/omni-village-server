const Joi = require("joi");
const DemographicDropdown = require("../Models/demographic-dropdown");

module.exports.get_demographic_dropdowns = async (req, res) => {
    const data = await DemographicDropdown.aggregate([
        {
            $group: {
                _id: "$type",
                data: { $push: "$$ROOT" },
            },
        },
    ]);

    const final_obj = data.reduce((prev, current) => {
        prev[current._id] = current.data;
        return prev;
    }, {});
    res.json(final_obj);
};

module.exports.add_demographic_data = async (req, res) => {
    const schema = Joi.object({
        name: Joi.string().required(),
        type: Joi.string().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await DemographicDropdown.create({
        name: {
            en: value.name,
            ms: value.name,
            dz: value.name,
        },
        type: value.type,
    });

    return res.json(data);
};
