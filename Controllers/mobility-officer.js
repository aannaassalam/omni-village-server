const Joi = require("joi");
const MobilityOfficer = require("../Models/mobility-officer");

module.exports.get_mobility_officer = async () => {
    const { user } = res.locals;
    const data = await MobilityOfficer.findOne({ moderator_id: user._id });
    return res.json(data);
};

module.exports.add_mobility_officer = async (req, res) => {
    const { user } = res.locals;
    const schema = Joi.object({
        house_connected_to_internal_road: Joi.string().required(),
        house_not_connected_to_internal_road: Joi.string().required(),
        village_connected_to_highway: Joi.boolean().required(),
        mobility_requirement: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        reason: Joi.string().required(),
        condition_of_internal_roads: Joi.string().required(),
        safety_issues_on_roads: Joi.boolean().required(),
        describe: Joi.string().required(),
        connectivity_to_healthcare_facilities: Joi.string().required(),
        road_infrastructure_damaged: Joi.boolean().required(),
        road_damage_frequency: Joi.string().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await MobilityOfficer.create({
        moderator_id: user._id,
        ...value,
    });

    return res.json({
        message: "Mobility added successfully",
        ...data._doc,
    });
};

module.exports.edit_mobility_officer = async (req, res) => {
    const schema = Joi.object({
        mobility_id: Joi.string().required(),
        house_connected_to_internal_road: Joi.string().required(),
        house_not_connected_to_internal_road: Joi.string().required(),
        village_connected_to_highway: Joi.boolean().required(),
        mobility_requirement: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        reason: Joi.string().required(),
        condition_of_internal_roads: Joi.string().required(),
        safety_issues_on_roads: Joi.boolean().required(),
        describe: Joi.string().required(),
        connectivity_to_healthcare_facilities: Joi.string().required(),
        road_infrastructure_damaged: Joi.boolean().required(),
        road_damage_frequency: Joi.string().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await MobilityOfficer.findByIdAndUpdate(
        value.mobility_id,
        value
    );

    return res.json({
        message: "Mobility edited successfully",
        ...data._doc,
    });
};

module.exports.delete_mobility_officer = async (req, res) => {
    const { user } = res.locals;
    const data = await MobilityOfficer.deleteMany({
        moderator_id: user._id,
    });
    return res.json({
        message: "Mobility deleted successfully",
        ...data._doc,
    });
};
