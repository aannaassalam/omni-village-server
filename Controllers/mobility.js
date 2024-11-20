const Joi = require("joi");
const AppError = require("../AppError");
const Mobility = require("../Models/mobility");

module.exports.get_mobility_details = async (req, res) => {
    const { mobility_id } = req.query;
    if (mobility_id) {
        const response = await Mobility.findById(mobility_id);
        return res.json(response);
    }
    throw new AppError(0, "Please provide a mobility_id");
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
        });

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
