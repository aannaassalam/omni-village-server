const Joi = require("joi");
const ForestryOfficer = require("../Models/forestry-officer");

module.exports.get_forestry_officer = async (req, res) => {
    const { user } = res.locals;
    const { village_id } = req.query;
    if (!village_id) throw new AppError(0, "Please provide village_id", 400);
    const data = await ForestryOfficer.findOne({
        moderator_id: user._id,
        village_id,
    });
    return res.json(data);
};

module.exports.add_forestry_officer = async (req, res) => {
    const { user } = res.locals;
    const schema = Joi.object({
        village_id: Joi.string().required(),
        type_of_forest_accessible: Joi.string().required(),
        area_of_forest_accessible: Joi.number().required(),
        do_you_have_flora_fauna: Joi.boolean().required(),
        link_of_the_doc: Joi.string().required(),
        condition_of_forest_accessible: Joi.string().required(),
        incident_of_forest_fire: Joi.string().optional().allow(null, ""),
        incident_of_wildlife_conflict: Joi.boolean().required(),
        describe: Joi.string().required(),
        any_incident_of_illegal_forest_activities: Joi.string()
            .optional()
            .allow(null, ""),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await ForestryOfficer.create({
        moderator_id: user._id,
        ...value,
    });

    return res.json({
        message: "Forestry added successfully",
        ...data._doc,
    });
};

module.exports.edit_forestry_officer = async (req, res) => {
    const schema = Joi.object({
        forestry_id: Joi.string().required(),
        type_of_forest_accessible: Joi.string().required(),
        area_of_forest_accessible: Joi.number().required(),
        do_you_have_flora_fauna: Joi.boolean().required(),
        link_of_the_doc: Joi.string().required(),
        condition_of_forest_accessible: Joi.string().required(),
        incident_of_forest_fire: Joi.string().optional().allow(null, ""),
        incident_of_wildlife_conflict: Joi.boolean().required(),
        describe: Joi.string().required(),
        any_incident_of_illegal_forest_activities: Joi.string()
            .optional()
            .allow(null, ""),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await ForestryOfficer.findByIdAndUpdate(
        value.forestry_id,
        value
    );

    return res.json({
        message: "Forestry edited successfully",
        ...data._doc,
    });
};

module.exports.delete_forestry_officer = async (req, res) => {
    const { user } = res.locals;
    const { village_id } = req.query;
    const data = await ForestryOfficer.deleteMany({
        moderator_id: user._id,
        village_id,
    });
    return res.json({
        message: "Forestry deleted successfully",
        ...data._doc,
    });
};
