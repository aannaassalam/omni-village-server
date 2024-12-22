const Joi = require("joi");
const CommunityDropdown = require("../Models/community-officer-dropdown");
const AppError = require("../AppError");

module.exports.get_all = async (req, res) => {
    const data = await CommunityDropdown.find({});
    return res.json(data);
};

module.exports.get_community_officer_dropdown = async (req, res) => {
    const data = await CommunityDropdown.find({});
    const obj = {};
    data.forEach((_data) => {
        obj[_data.type] = [...(obj[_data.type] || []), _data];
    });
    return res.json(obj);
};

module.exports.add_community_officer_dropdown = async (req, res) => {
    const schema = Joi.object({
        type: Joi.string()
            .required()
            .equal(
                "no_of_townhall",
                "no_of_market",
                "no_of_bank",
                "distance_of_bank",
                "no_of_healthcare",
                "distance_of_healthcare",
                "no_of_library",
                "no_of_museum",
                "kind_of_sports",
                "frequency_of_spiritual_retreats",
                "no_of_spiritual_sanctums",
                "no_of_post_office",
                "post_office_distance",
                "no_of_sewage_treatment_facility",
                "types_of_sewage_treatment_facility",
                "no_of_composting_facility",
                "types_of_composting_facility",
                "types_of_recycling_facility",
                "level_of_waste_segregation",
                "type_of_street_lights",
                "no_of_broadband_providers",
                "method_of_broadband",
                "bandwidth_of_broadband",
                "stability_of_broadband",
                "distance_of_burial_cremation",
                "distance_of_animal_shelters",
                "type_of_animal_shelters",
                "capacity_of_parking",
                "type_of_children_playground",
                "type_of_senile_center",
                "type_of_mobility",
                "capacity_of_water_storage",
                "type_of_cold_storage",
                "capacity_of_cold_storage",
                "type_of_energy_and_battery_house",
                "capacity_of_energy_and_battery_house"
            ),
        name: Joi.object({
            en: Joi.string().required(),

            ms: Joi.string().optional().allow("", null),

            dz: Joi.string().optional().allow("", null),
        }).required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await CommunityDropdown.create({
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

module.exports.edit_community_officer_data = async (req, res) => {
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
                "no_of_townhall",
                "no_of_market",
                "no_of_bank",
                "distance_of_bank",
                "no_of_healthcare",
                "distance_of_healthcare",
                "no_of_library",
                "no_of_museum",
                "kind_of_sports",
                "frequency_of_spiritual_retreats",
                "no_of_spiritual_sanctums",
                "no_of_post_office",
                "post_office_distance",
                "no_of_sewage_treatment_facility",
                "types_of_sewage_treatment_facility",
                "no_of_composting_facility",
                "types_of_composting_facility",
                "types_of_recycling_facility",
                "level_of_waste_segregation",
                "type_of_street_lights",
                "no_of_broadband_providers",
                "method_of_broadband",
                "bandwidth_of_broadband",
                "stability_of_broadband",
                "distance_of_burial_cremation",
                "distance_of_animal_shelters",
                "type_of_animal_shelters",
                "capacity_of_parking",
                "type_of_children_playground",
                "type_of_senile_center",
                "type_of_mobility",
                "capacity_of_water_storage",
                "type_of_cold_storage",
                "capacity_of_cold_storage",
                "type_of_energy_and_battery_house",
                "capacity_of_energy_and_battery_house"
            ),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await CommunityDropdown.findByIdAndUpdate(value.dropdown_id, {
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

module.exports.delete_community_officer_data = async (req, res) => {
    const { id } = req.query;
    if (id) {
        const data = await CommunityDropdown.findByIdAndDelete(id);
        return res.json({
            message: "Dropdown data deleted successfully",
            ...data._doc,
        });
    }
    throw new AppError(0, "Please provide a dropdown_id", 400);
};
