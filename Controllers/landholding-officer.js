const Joi = require("joi");
const LandholdingOfficer = require("../Models/landholding-officer");

module.exports.get_landholding_officer = async (req, res) => {
    const { user } = res.locals;
    const { village_id } = req.query;
    if (!village_id) throw new AppError(0, "Please provide village_id", 400);
    const data = await LandholdingOfficer.findOne({
        moderator_id: user._id,
        village_id,
    });
    return res.json(data);
};

module.exports.add_landholding_officer = async (req, res) => {
    const { user } = res.locals;
    const schema = Joi.object({
        village_id: Joi.string().required(),
        total_area_allocated_village: Joi.number().required(),
        area_unit: Joi.string().required(),
        farming_community_infrastructure: Joi.number().required(),
        unutilized_area: Joi.number().required(),
        fallow: Joi.number().required(),
        under_forest: Joi.number().required(),
        under_grassland: Joi.number().required(),
        others: Joi.number().optional(),
        land_owned_by_non_resident: Joi.number().required(),
        total_area_privately_owned: Joi.number().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await LandholdingOfficer.create({
        moderator_id: user._id,
        ...value,
    });

    return res.json({
        message: "Landholding added successfully",
        ...data._doc,
    });
};

module.exports.edit_landholding_officer = async (req, res) => {
    const schema = Joi.object({
        landholding_id: Joi.string().required(),
        total_area_allocated_village: Joi.number().required(),
        area_unit: Joi.string().required(),
        farming_community_infrastructure: Joi.number().required(),
        unutilized_area: Joi.number().required(),
        fallow: Joi.number().required(),
        under_forest: Joi.number().required(),
        under_grassland: Joi.number().required(),
        others: Joi.number().optional(),
        land_owned_by_non_resident: Joi.number().required(),
        total_area_privately_owned: Joi.number().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await LandholdingOfficer.findByIdAndUpdate(
        value.landholding_id,
        value
    );

    return res.json({
        message: "Landholding edited successfully",
        ...data._doc,
    });
};

module.exports.delete_landholding_officer = async (req, res) => {
    const { user } = res.locals;
    const { village_id } = req.query;
    const data = await LandholdingOfficer.deleteMany({
        moderator_id: user._id,
        village_id,
    });
    return res.json({
        message: "Landholding deleted successfully",
        ...data._doc,
    });
};
