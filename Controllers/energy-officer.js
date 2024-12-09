const Joi = require("joi");
const EnergyOfficer = require("../Models/energy-officer");

module.exports.get_energy_officer = async () => {
    const { user } = res.locals;
    const { village_id } = req.query;
    if (!village_id) throw new AppError(0, "Please provide village_id", 400);
    const data = await EnergyOfficer.findOne({
        moderator_id: user._id,
        village_id,
    });
    return res.json(data);
};

module.exports.add_energy_officer = async (req, res) => {
    const { user } = res.locals;
    const schema = Joi.object({
        village_id: Joi.string().required(),
        available_renewable_energy: Joi.array()
            .items(
                Joi.object({
                    type: Joi.string().required(),
                    energy_source: Joi.boolean().required(),
                    capacity: Joi.number().required(),
                    distribution_method: Joi.array()
                        .items(Joi.string().required())
                        .required()
                        .min(1),
                    installation_cost: Joi.number().required(),
                    central_grid_fossil: Joi.number().required(),
                    central_grid_renewable: Joi.number().required(),
                    local_renewable_microgrid: Joi.number().required(),
                    distance_to_pumps: Joi.string().required(),
                }).required()
            )
            .required()
            .min(1),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await EnergyOfficer.create({
        moderator_id: user._id,
        ...value,
    });

    return res.json({
        message: "Energy added successfully",
        ...data._doc,
    });
};

module.exports.edit_energy_officer = async (req, res) => {
    const schema = Joi.object({
        energy_id: Joi.string().required(),
        available_renewable_energy: Joi.array()
            .items(
                Joi.object({
                    type: Joi.string().required(),
                    energy_source: Joi.boolean().required(),
                    capacity: Joi.number().required(),
                    distribution_method: Joi.array()
                        .items(Joi.string().required())
                        .required()
                        .min(1),
                    installation_cost: Joi.number().required(),
                    central_grid_fossil: Joi.number().required(),
                    central_grid_renewable: Joi.number().required(),
                    local_renewable_microgrid: Joi.number().required(),
                    distance_to_pumps: Joi.string().required(),
                }).required()
            )
            .required()
            .min(1),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await EnergyOfficer.findByIdAndUpdate(value.energy_id, value);

    return res.json({
        message: "Energy edited successfully",
        ...data._doc,
    });
};

module.exports.delete_energy_officer = async (req, res) => {
    const { user } = res.locals;
    const { village_id } = req.query;
    const data = await EnergyOfficer.deleteMany({
        moderator_id: user._id,
        village_id,
    });
    return res.json({
        message: "Energy deleted successfully",
        ...data._doc,
    });
};
