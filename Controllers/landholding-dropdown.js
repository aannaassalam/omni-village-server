const Joi = require("joi");
const LandholdingDropdown = require("../Models/landholding-dropdown");

module.exports.get_all = async (req, res) => {
    const data = await LandholdingDropdown.find({});
    return res.json(data);
};

module.exports.get_landholding_dropdown = async (req, res) => {
    const data = await LandholdingDropdown.find({});
    const obj = {
        purpose: [],
        status: [],
        purpose_requirement: [],
        urgency_requirement: [],
    };
    data.forEach((_data) => {
        if (!_data.parent) {
            obj[_data.type] = [...obj[_data.type], _data];
            obj[_data._id] = [];
        } else {
            obj[_data.parent] = [...obj[_data.parent], _data];
        }
    });
    return res.json(obj);
};

module.exports.add_landholding_dropdown = async (req, res) => {
    const schema = Joi.object({
        type: Joi.string().required().equal("purpose", "status"),
        name: Joi.object({
            en: Joi.string().required(),

            ms: Joi.string().optional().allow("", null),

            dz: Joi.string().optional().allow("", null),
        }).required(),
        parent: Joi.string().optional().allow(null),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await LandholdingDropdown.create({
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
