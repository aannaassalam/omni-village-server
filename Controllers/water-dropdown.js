const Joi = require("joi");
const WaterDropdown = require("../Models/water-dropdown");

module.exports.get_all = async (req, res) => {
    const data = await WaterDropdown.find({});
    return res.json(data);
};

module.exports.get_water_dropdown = async (req, res) => {
    const data = await WaterDropdown.find({});
    const obj = {};
    data.forEach((_data) => {
        obj[_data.type] = [...(obj[_data.type] || []), _data];
    });
    return res.json(obj);
};

module.exports.add_water_dropdown = async (req, res) => {
    const schema = Joi.object({
        type: Joi.string()
            .required()
            .equal(
                "yearly_consumption",
                "sourced_from",
                "water_quality",
                "type_of_harvesting",
                "wastewater",
                "water_recycling",
                "severity"
            ),
        name: Joi.object({
            en: Joi.string().required(),

            ms: Joi.string().optional().allow("", null),

            dz: Joi.string().optional().allow("", null),
        }).required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await WaterDropdown.create({
        ...value,
        name: {
            en: value.name.en,
            ms: value.name.ms || value.name.en,
            dz: value.name.dz || value.name.en,
        },
    });

    return res.json({
        message: "Dropdown added successfully",
        ...data._doc,
    });
};
