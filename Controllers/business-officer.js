const Joi = require("joi");
const BusinessOfficer = require("../Models/business-officer");

module.exports.get_business_officer = async (req, res) => {
    const { user } = res.locals;
    const { village_id } = req.query;
    if (!village_id) throw new AppError(0, "Please provide village_id", 400);
    const data = await BusinessOfficer.findOne({
        moderator_id: user._id,
        village_id,
    });
    return res.json(data);
};

module.exports.add_business_officer = async (req, res) => {
    const { user } = res.locals;
    const schema = Joi.object({
        village_id: Joi.string().required(),
        organisation_not_owned_by_villagers: Joi.boolean().required(),
        how_many_establishment: Joi.array().items(
            Joi.object({
                name: Joi.string().required(),
                type: Joi.string().required(),
                purpose: Joi.string().required(),
                year_started: Joi.number().required(),
            }).required()
        ),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await BusinessOfficer.create({
        moderator_id: user._id,
        ...value,
    });

    return res.json({
        message: "Business added successfully",
        ...data._doc,
    });
};

module.exports.edit_business_officer = async (req, res) => {
    const schema = Joi.object({
        business_id: Joi.string().required(),
        organisation_not_owned_by_villagers: Joi.boolean().required(),
        how_many_establishment: Joi.array().items(
            Joi.object({
                name: Joi.string().required(),
                type: Joi.string().required(),
                purpose: Joi.string().required(),
                year_started: Joi.number().required(),
            }).required()
        ),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await BusinessOfficer.findByIdAndUpdate(
        value.business_id,
        value
    );

    return res.json({
        message: "Business edited successfully",
        ...data._doc,
    });
};

module.exports.delete_business_officer = async (req, res) => {
    const { user } = res.locals;
    const { village_id } = req.query;
    const data = await BusinessOfficer.deleteMany({
        moderator_id: user._id,
        village_id,
    });
    return res.json({
        message: "Business deleted successfully",
        ...data._doc,
    });
};
