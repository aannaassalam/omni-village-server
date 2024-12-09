const Joi = require("joi");
const WaterOfficer = require("../Models/water-officer");

module.exports.get_water_officer = async () => {
    const { user } = res.locals;
    const { village_id } = req.query;
    if (!village_id) throw new AppError(0, "Please provide village_id", 400);
    const data = await WaterOfficer.findOne({
        moderator_id: user._id,
        village_id,
    });
    return res.json(data);
};

module.exports.add_water_officer = async (req, res) => {
    const { user } = res.locals;
    const schema = Joi.object({
        village_id: Joi.string().required(),
        water_source_available: Joi.array()
            .items(
                Joi.object({
                    type: Joi.string().required(),
                    condition: Joi.string().required(),
                    tapped_into: Joi.string().required(),
                    sustainable_yearly_supply: Joi.number().required(),
                    yearly_consumption: Joi.number().required(),
                    storage_capacity: Joi.number().required(),
                    distribution_method: Joi.string().required(),
                    storage_method: Joi.string().required(),
                    rate_of_replenishment: Joi.number().required(),
                }).required()
            )
            .required()
            .min(1),
        sewage_treatment: Joi.boolean().required(),
        capacity: Joi.number().required(),
        treated_water_discharged: Joi.string().required(),
        number_of_houses: Joi.number().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await WaterOfficer.create({
        moderator_id: user._id,
        ...value,
    });

    return res.json({
        message: "Water added successfully",
        ...data._doc,
    });
};

module.exports.edit_water_officer = async (req, res) => {
    const schema = Joi.object({
        water_id: Joi.string().required(),
        water_source_available: Joi.array()
            .items(
                Joi.object({
                    type: Joi.string().required(),
                    condition: Joi.string().required(),
                    tapped_into: Joi.string().required(),
                    sustainable_yearly_supply: Joi.number().required(),
                    yearly_consumption: Joi.number().required(),
                    storage_capacity: Joi.number().required(),
                    distribution_method: Joi.string().required(),
                    storage_method: Joi.string().required(),
                    rate_of_replenishment: Joi.number().required(),
                }).required()
            )
            .required()
            .min(1),
        sewage_treatment: Joi.boolean().required(),
        capacity: Joi.number().required(),
        treated_water_discharged: Joi.string().required(),
        number_of_houses: Joi.number().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await WaterOfficer.findByIdAndUpdate(value.water_id, value);

    return res.json({
        message: "Water edited successfully",
        ...data._doc,
    });
};

module.exports.delete_water_officer = async (req, res) => {
    const { user } = res.locals;
    const { village_id } = req.query;
    const data = await WaterOfficer.deleteMany({
        moderator_id: user._id,
        village_id,
    });
    return res.json({
        message: "Water deleted successfully",
        ...data._doc,
    });
};
