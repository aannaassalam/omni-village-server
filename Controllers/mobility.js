const Joi = require("joi");
const AppError = require("../AppError");
const Mobility = require("../Models/mobility");

module.exports.get_mobility_by_user = async (req, res) => {
    const { user } = res.locals;
    const mobility_by_user = await Mobility.find({
        user_id: user._id,
    });
    return res.json(mobility_by_user);
};

module.exports.get_mobility_details = async (req, res) => {
    const { mobility_id } = req.query;
    if (mobility_id) {
        const response = await Mobility.findById(mobility_id);
        return res.json(response);
    }
    throw new AppError(0, "Please provide a mobility_id");
};

module.exports.add_mobility_details = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            type: Joi.string().required(),
            distance_travelled_within_village: Joi.number().required(),
            distance_travelled_outside: Joi.number().required(),
            purpose_use_of_vehicle: Joi.array()
                .items(Joi.string().required())
                .required()
                .min(1),
            frequency_of_usage: Joi.string().required(),
            status: Joi.number().allow(0, 1).required(),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const response = await Mobility.create({ user_id: user._id, ...value });
        return res.json(response);
    }

    const response = await Mobility.create({ user_id: user._id, ...req.body });
    return res.json(response);
};

module.exports.update_mobility_details = async (req, res) => {
    if (req.body.status) {
        const schema = Joi.object({
            mobility_id: Joi.string().required(),
            type: Joi.string().required(),
            distance_travelled_within_village: Joi.number().required(),
            distance_travelled_outside: Joi.number().required(),
            purpose_use_of_vehicle: Joi.array()
                .items(Joi.string().required())
                .required()
                .min(1),
            frequency_of_usage: Joi.string().required(),
            status: Joi.number().allow(0, 1).required(),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const response = await Mobility.findByIdAndUpdate(
            value.mobility_id,
            value,
            { new: true, runValidators: true }
        );
        return res.json(response);
    }

    const response = await Mobility.findByIdAndUpdate(
        req.body.mobility_id,
        req.body,
        {
            new: true,
            runValidators: true,
        }
    );
    return res.json(response);
};

module.exports.delete_mobility = async (req, res) => {
    const { id } = req.query;
    await Mobility.findByIdAndDelete(id);
    return res.json({
        message: "Mobility deleted successfully",
    });
};
