const Joi = require("joi");
const HousingDropdown = require("../Models/housing-dropdown");

module.exports.get_housing_dropdown = async (req, res) => {
    const data = await HousingDropdown.find({});
    const obj = {
        purpose: [],
    };
    data.forEach((_data) => {
        obj[_data.type] = [...(obj[_data.type] || []), _data];
    });
    return res.json(obj);
};

module.exports.add_housing_dropdown = async (req, res) => {
    const schema = Joi.object({
        type: Joi.string()
            .required()
            .allow("type", "amenities", "urgency", "equipment", "furnishing"),
        name: Joi.object({
            en: Joi.string().required(),

            ms: Joi.string().optional().allow("", null),

            dz: Joi.string().optional().allow("", null),
        }).required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await HousingDropdown.create({
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
