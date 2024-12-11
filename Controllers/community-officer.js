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
        town_hall_purpose: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        market: Joi.boolean().required(),
        how_many_market: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        bank: Joi.boolean().required(),
        how_many_bank: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        how_far_from_village_bank: Joi.string().required(),
        health_care: Joi.boolean().required(),
        how_many_healthcare: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        how_far_from_village_healthcare: Joi.string().required(),
        library: Joi.boolean().required(),
        how_many_library: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        museum: Joi.boolean().required(),
        how_many_museum: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        sports: Joi.boolean().required(),
        kind_of_sports: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        spiritual_retreats: Joi.boolean().required(),
        how_frequently: Joi.string().required(),
        spiritual_sanctums: Joi.boolean().required(),
        how_many_sanctums: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        post_office: Joi.boolean().required(),
        how_many_post_offices: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        how_far_from_village_offices: Joi.string().required(),
        sewage_treatment_facility: Joi.boolean().required(),
        how_many_sewage_treatment: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        sewage_type: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        composing_facility: Joi.boolean().required(),
        how_many_composing_facility: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        composing_type: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        recycling: Joi.boolean().required(),
        recycling_type: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        water_segregation: Joi.boolean().required(),
        level_of_segregation: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        mobility: Joi.boolean().required(),
        type_of_mobility: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        water_storage: Joi.boolean().required(),
        water_capacity: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        cold_storage: Joi.boolean().required(),
        cold_storage_type: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        cold_storage_capacity: Joi.string().required(),
        energy_battery_house: Joi.boolean().required(),
        energy_battery_capacity: Joi.string().required(),
        energy_battery_type: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        others: Joi.string().optional().allow(null),
        access_to_newspaper: Joi.boolean().required(),
    });

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
        town_hall_purpose: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        market: Joi.boolean().required(),
        how_many_market: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        bank: Joi.boolean().required(),
        how_many_bank: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        how_far_from_village_bank: Joi.string().required(),
        health_care: Joi.boolean().required(),
        how_many_healthcare: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        how_far_from_village_healthcare: Joi.string().required(),
        library: Joi.boolean().required(),
        how_many_library: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        museum: Joi.boolean().required(),
        how_many_museum: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        sports: Joi.boolean().required(),
        kind_of_sports: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        spiritual_retreats: Joi.boolean().required(),
        how_frequently: Joi.string().required(),
        spiritual_sanctums: Joi.boolean().required(),
        how_many_sanctums: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        post_office: Joi.boolean().required(),
        how_many_post_offices: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        how_far_from_village_offices: Joi.string().required(),
        sewage_treatment_facility: Joi.boolean().required(),
        how_many_sewage_treatment: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        sewage_type: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        composing_facility: Joi.boolean().required(),
        how_many_composing_facility: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        composing_type: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        recycling: Joi.boolean().required(),
        recycling_type: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        water_segregation: Joi.boolean().required(),
        level_of_segregation: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        mobility: Joi.boolean().required(),
        type_of_mobility: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        water_storage: Joi.boolean().required(),
        water_capacity: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        cold_storage: Joi.boolean().required(),
        cold_storage_type: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        cold_storage_capacity: Joi.string().required(),
        energy_battery_house: Joi.boolean().required(),
        energy_battery_capacity: Joi.string().required(),
        energy_battery_type: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        others: Joi.string().optional().allow(null),
        access_to_newspaper: Joi.boolean().required(),
    });

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
