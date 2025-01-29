const Joi = require("joi");
const EnergyDropdown = require("../Models/energy-dropdown");
const AppError = require("../AppError");

module.exports.get_all = async (req, res) => {
    const data = await EnergyDropdown.find({});
    return res.json(data);
};

module.exports.get_energy_dropdown = async (req, res) => {
    const data = await EnergyDropdown.find({});
    const obj = {};
    data.forEach((_data) => {
        obj[_data.type] = [...(obj[_data.type] || []), _data];
    });
    return res.json(obj);
};

module.exports.add_energy_dropdown = async (req, res) => {
    const schema = Joi.object({
        type: Joi.string()
            .required()
            .equal(
                "microgrid_type",
                "purpose_petrol",
                "purpose_diesel",
                "purpose_natural_gas",
                "type_others",
                "purpose_others",
                "extent",
                "dropdown"
            ),
        name: Joi.object({
            en: Joi.string().required(),

            ms: Joi.string().optional().allow("", null),

            dz: Joi.string().optional().allow("", null),
        }).required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await EnergyDropdown.create({
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

module.exports.edit_energy_data = async (req, res) => {
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
                "microgrid_type",
                "purpose_petrol",
                "purpose_diesel",
                "purpose_natural_gas",
                "type_others",
                "purpose_others",
                "extent",
                "dropdown"
            ),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await EnergyDropdown.findByIdAndUpdate(value.dropdown_id, {
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

module.exports.delete_energy_data = async (req, res) => {
    const { id } = req.query;
    if (id) {
        const data = await EnergyDropdown.findByIdAndDelete(id);
        return res.json({
            message: "Dropdown data deleted successfully",
            ...data._doc,
        });
    }
    throw new AppError(0, "Please provide a dropdown_id", 400);
};
