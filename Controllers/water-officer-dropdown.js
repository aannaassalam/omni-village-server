const Joi = require("joi");
const WaterDropdown = require("../Models/water-officer-dropdown");
const AppError = require("../AppError");

module.exports.get_all = async (req, res) => {
    const data = await WaterDropdown.find({});
    return res.json(data);
};

module.exports.get_water_officer_dropdown = async (req, res) => {
    const data = await WaterDropdown.find({});
    const obj = {};
    data.forEach((_data) => {
        obj[_data.type] = [...(obj[_data.type] || []), _data];
    });
    return res.json(obj);
};

module.exports.add_water_officer_dropdown = async (req, res) => {
    const schema = Joi.object({
        type: Joi.string()
            .required()
            .equal(
                "water_source",
                "condition",
                "tapped_into",
                "distribution_method",
                "storage_method",
                "treated_water_discharged"
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

module.exports.edit_water_officer_data = async (req, res) => {
    const schema = Joi.object({
        dropdown_id: Joi.string().required(),
        name: Joi.object({
            en: Joi.string().required(),

            ms: Joi.string().optional().allow("", null),

            dz: Joi.string().optional().allow("", null),
        }).required(),
        type: Joi.string()
            .required()
            .equal(
                "water_source",
                "condition",
                "tapped_into",
                "distribution_method",
                "storage_method",
                "treated_water_discharged"
            ),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await WaterDropdown.findByIdAndUpdate(value.dropdown_id, {
        ...value,
        name: {
            en: value.name.en,
            ms: value.name.ms || value.name.en,
            dz: value.name.dz || value.name.en,
        },
    });

    return res.json({
        message: "Dropdown updated successfully",
        ...data._doc,
    });
};

module.exports.delete_water_officer_data = async (req, res) => {
    const { id } = req.query;
    if (id) {
        const data = await WaterDropdown.findByIdAndDelete(id);
        return res.json({
            message: "Dropdown data deleted successfully",
            ...data._doc,
        });
    }
    throw new AppError(0, "Please provide a dropdown_id", 400);
};
