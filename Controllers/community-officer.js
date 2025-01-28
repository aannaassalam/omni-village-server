const Joi = require("joi");
const CommunityOfficer = require("../Models/community-officer");

module.exports.get_community_officer = async (req, res) => {
    const { user } = res.locals;
    const { village_id } = req.query;
    if (!village_id) throw new AppError(0, "Please provide village_id", 400);
    const data = await CommunityOfficer.findOne({
        moderator_id: user._id,
        village_id,
    });
    return res.json(data);
};

module.exports.add_community_officer = async (req, res) => {
    const { user } = res.locals;
    const schema = Joi.object({
        village_id: Joi.string().required(),
        town_hall: Joi.boolean().required(),
        town_hall_purpose: Joi.array().items(Joi.string().allow("")).optional(),
        market: Joi.boolean().required(),
        how_many_market: Joi.array().items(Joi.string().allow("")).optional(),
        bank: Joi.boolean().required(),
        how_many_bank: Joi.array().items(Joi.string().allow("")).optional(),
        how_far_from_village_bank: Joi.string().required(),
        health_care: Joi.boolean().required(),
        how_many_healthcare: Joi.array()
            .items(Joi.string().allow(""))
            .optional(),
        how_far_from_village_healthcare: Joi.string().required(),
        library: Joi.boolean().required(),
        how_many_library: Joi.array().items(Joi.string().allow("")).optional(),
        museum: Joi.boolean().required(),
        how_many_museum: Joi.array().items(Joi.string().allow("")).optional(),
        sports: Joi.boolean().required(),
        kind_of_sports: Joi.array().items(Joi.string().allow("")).optional(),
        spiritual_retreats: Joi.boolean().required(),
        how_frequently: Joi.string().required(),
        spiritual_sanctums: Joi.boolean().required(),
        how_many_sanctums: Joi.array().items(Joi.string().allow("")).optional(),
        post_office: Joi.boolean().required(),
        how_many_post_offices: Joi.array()
            .items(Joi.string().allow(""))
            .optional(),
        how_far_from_village_offices: Joi.string().required(),
        sewage_treatment_facility: Joi.boolean().required(),
        how_many_sewage_treatment: Joi.array()
            .items(Joi.string().allow(""))
            .optional(),
        sewage_type: Joi.array().items(Joi.string().allow("")).optional(),
        composing_facility: Joi.boolean().required(),
        how_many_composing_facility: Joi.array()
            .items(Joi.string().allow(""))
            .optional(),
        composing_type: Joi.array().items(Joi.string().allow("")).optional(),
        recycling: Joi.boolean().required(),
        recycling_type: Joi.array().items(Joi.string().allow("")).optional(),
        water_segregation: Joi.boolean().required(),
        level_of_segregation: Joi.array()
            .items(Joi.string().allow(""))
            .optional(),
        mobility: Joi.boolean().required(),
        type_of_mobility: Joi.array().items(Joi.string().allow("")).optional(),
        water_storage: Joi.boolean().required(),
        water_capacity: Joi.array().items(Joi.string().allow("")).optional(),
        cold_storage: Joi.boolean().required(),
        cold_storage_type: Joi.array().items(Joi.string().allow("")).optional(),
        cold_storage_capacity: Joi.string().required(),
        energy_battery_house: Joi.boolean().required(),
        energy_battery_capacity: Joi.string().required(),
        energy_battery_type: Joi.array()
            .items(Joi.string().allow(""))
            .optional(),
        others: Joi.string().optional().allow(""),
        access_to_newspaper: Joi.boolean().required(),
        street_light: Joi.boolean().required(),
        solar_electric: Joi.string().required(),
        broadband_internet: Joi.boolean().required(),
        how_many_provider: Joi.array().items(Joi.string().allow("")).optional(),
        methods_of_using: Joi.array().items(Joi.string().allow("")).optional(),
        bandwidth: Joi.array().items(Joi.string().allow("")).optional(),
        stability: Joi.array().items(Joi.string().allow("")).optional(),
        burial_ground: Joi.boolean().required(),
        how_far_from_village_burial_ground: Joi.string().required(),
        animal_shelters: Joi.boolean().required(),
        how_far_from_village_animal_shelter: Joi.string().required(),
        animal_shelter_type: Joi.array()
            .items(Joi.string().allow(""))
            .optional(),
        parking: Joi.boolean().required(),
        capacity: Joi.string().required(),
        children_playground: Joi.boolean().required(),
        children_playground_type: Joi.array()
            .items(Joi.string().allow(""))
            .optional(),
        senile_center: Joi.boolean().required(),
        senile_center_type: Joi.array()
            .items(Joi.string().allow(""))
            .optional(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await CommunityOfficer.create({
        moderator_id: user._id,
        ...value,
    });

    return res.json({
        message: "Community added successfully",
        ...data._doc,
    });
};

module.exports.edit_community_officer = async (req, res) => {
    const schema = Joi.object({
        community_id: Joi.string().required(),
        town_hall: Joi.boolean().required(),
        town_hall_purpose: Joi.array().items(Joi.string().allow("")).optional(),
        market: Joi.boolean().required(),
        how_many_market: Joi.array().items(Joi.string().allow("")).optional(),
        bank: Joi.boolean().required(),
        how_many_bank: Joi.array().items(Joi.string().allow("")).optional(),
        how_far_from_village_bank: Joi.string().required(),
        health_care: Joi.boolean().required(),
        how_many_healthcare: Joi.array()
            .items(Joi.string().allow(""))
            .optional(),
        how_far_from_village_healthcare: Joi.string().required(),
        library: Joi.boolean().required(),
        how_many_library: Joi.array().items(Joi.string().allow("")).optional(),
        museum: Joi.boolean().required(),
        how_many_museum: Joi.array().items(Joi.string().allow("")).optional(),
        sports: Joi.boolean().required(),
        kind_of_sports: Joi.array().items(Joi.string().allow("")).optional(),
        spiritual_retreats: Joi.boolean().required(),
        how_frequently: Joi.string().required(),
        spiritual_sanctums: Joi.boolean().required(),
        how_many_sanctums: Joi.array().items(Joi.string().allow("")).optional(),
        post_office: Joi.boolean().required(),
        how_many_post_offices: Joi.array()
            .items(Joi.string().allow(""))
            .optional(),
        how_far_from_village_offices: Joi.string().required(),
        sewage_treatment_facility: Joi.boolean().required(),
        how_many_sewage_treatment: Joi.array()
            .items(Joi.string().allow(""))
            .optional(),
        sewage_type: Joi.array().items(Joi.string().allow("")).optional(),
        composing_facility: Joi.boolean().required(),
        how_many_composing_facility: Joi.array()
            .items(Joi.string().allow(""))
            .optional(),
        composing_type: Joi.array().items(Joi.string().allow("")).optional(),
        recycling: Joi.boolean().required(),
        recycling_type: Joi.array().items(Joi.string().allow("")).optional(),
        water_segregation: Joi.boolean().required(),
        level_of_segregation: Joi.array()
            .items(Joi.string().allow(""))
            .optional(),
        mobility: Joi.boolean().required(),
        type_of_mobility: Joi.array().items(Joi.string().allow("")).optional(),
        water_storage: Joi.boolean().required(),
        water_capacity: Joi.array().items(Joi.string().allow("")).optional(),
        cold_storage: Joi.boolean().required(),
        cold_storage_type: Joi.array().items(Joi.string().allow("")).optional(),
        cold_storage_capacity: Joi.string().required(),
        energy_battery_house: Joi.boolean().required(),
        energy_battery_capacity: Joi.string().required(),
        energy_battery_type: Joi.array()
            .items(Joi.string().allow(""))
            .optional(),
        others: Joi.string().optional().allow(""),
        access_to_newspaper: Joi.boolean().required(),
        street_light: Joi.boolean().required(),
        solar_electric: Joi.string().required(),
        broadband_internet: Joi.boolean().required(),
        how_many_provider: Joi.array().items(Joi.string().allow("")).optional(),
        methods_of_using: Joi.array().items(Joi.string().allow("")).optional(),
        bandwidth: Joi.array().items(Joi.string().allow("")).optional(),
        stability: Joi.array().items(Joi.string().allow("")).optional(),
        burial_ground: Joi.boolean().required(),
        how_far_from_village_burial_ground: Joi.string().required(),
        animal_shelters: Joi.boolean().required(),
        how_far_from_village_animal_shelter: Joi.string().required(),
        animal_shelter_type: Joi.array()
            .items(Joi.string().allow(""))
            .optional(),
        parking: Joi.boolean().required(),
        capacity: Joi.string().required(),
        children_playground: Joi.boolean().required(),
        children_playground_type: Joi.array()
            .items(Joi.string().allow(""))
            .optional(),
        senile_center: Joi.boolean().required(),
        senile_center_type: Joi.array()
            .items(Joi.string().allow(""))
            .optional(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await CommunityOfficer.findByIdAndUpdate(
        value.community_id,
        value
    );

    return res.json({
        message: "Community edited successfully",
        ...data._doc,
    });
};

module.exports.delete_community_officer = async (req, res) => {
    const { user } = res.locals;
    const { village_id } = req.query;
    const data = await CommunityOfficer.deleteMany({
        moderator_id: user._id,
        village_id,
    });
    return res.json({
        message: "Community deleted successfully",
        ...data._doc,
    });
};
