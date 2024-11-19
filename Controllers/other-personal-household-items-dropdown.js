const Joi = require("joi");
const PersonalHouseholdDropdown = require("../Models/other-personal-household-items-dropdown");
const AppError = require("../AppError");

module.exports.get_all = async (req, res) => {
    const data = await PersonalHouseholdDropdown.find({});
    return res.json(data);
};

module.exports.get_personal_household_dropdown = async (req, res) => {
    const data = await PersonalHouseholdDropdown.find({});
    const obj = {};
    data.forEach((_data) => {
        obj[_data.type] = [...(obj[_data.type] || []), _data];
    });
    return res.json(obj);
};

module.exports.add_personal_household_dropdown = async (req, res) => {
    const schema = Joi.object({
        type: Joi.string()
            .required()
            .equal(
                "personal_care",
                "personal_care_produce",
                "cleaning_products",
                "cleaning_products_produce",
                "office_supplies",
                "office_supplies_produce",
                "medicine",
                "medicine_produce",
                "kitchen_items",
                "kitchen_items_produce",
                "other_items",
                "other_items_produce"
            ),
        name: Joi.object({
            en: Joi.string().required(),

            ms: Joi.string().optional().allow("", null),

            dz: Joi.string().optional().allow("", null),
        }).required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await PersonalHouseholdDropdown.create({
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

module.exports.edit_personal_household_data = async (req, res) => {
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
                "personal_care",
                "personal_care_produce",
                "cleaning_products",
                "cleaning_products_produce",
                "office_supplies",
                "office_supplies_produce",
                "medicine",
                "medicine_produce",
                "kitchen_items",
                "kitchen_items_produce",
                "other_items",
                "other_items_produce"
            ),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await PersonalHouseholdDropdown.findByIdAndUpdate(
        value.dropdown_id,
        {
            ...value,
            name: {
                en: value.name.en,
                ms: value.name.ms || value.name.en,
                dz: value.name.dz || value.name.en,
            },
        }
    );

    return res.json({
        message: "Dropdown updated successfully",
        ...data._doc,
    });
};

module.exports.delete_personal_household_data = async (req, res) => {
    const { id } = req.query;
    if (id) {
        const data = await PersonalHouseholdDropdown.findByIdAndDelete(id);
        return res.json({
            message: "Dropdown data deleted successfully",
            ...data._doc,
        });
    }
    throw new AppError(0, "Please provide a dropdown_id", 400);
};
