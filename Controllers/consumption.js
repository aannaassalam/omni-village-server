const Joi = require("joi");
const Consumption = require("../Models/consumption");
const mongoose = require("mongoose");

module.exports.get_consumptions = async (req, res) => {
    const { user } = res.locals;
    const { consumption_type_id } = req.params;

    try {
        const consumption_doc = await Consumption.aggregate([
            {
                $match: {
                    user_id: user._id,
                    consumption_type_id,
                },
            },
            {
                $lookup: {
                    from: "crops",
                    localField: "crop_id",
                    foreignField: "_id",
                    as: "crop",
                },
            },
            {
                $unwind: {
                    path: "$crop",
                    preserveNullAndEmptyArrays: true,
                },
            },
        ]);
        return res.json(consumption_doc);
    } catch (err) {
        console.log(err);
        res.status(400).json(handleErrors(err));
    }
};

module.exports.add_consumption = async (req, res) => {
    const { user } = res.locals;

    if (req.body.status) {
        const schema = Joi.object({
            consumption_type_id: Joi.string().required(),
            crop_id: Joi.string().required(),
            total_quantity: Joi.number().required(),
            weight_measurement: Joi.string().required(),
            purchased_from_market: Joi.number().required(),
            purchased_from_neighbours: Joi.number().required(),
            self_grown: Joi.number().required(),
            status: Joi.number().required().allow(0, 1),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const consumption_doc = await Consumption.create({
            user_id: user._id,
            ...value,
        });
        return res.json(consumption_doc);
    }
    const consumption_doc = await Consumption.create({
        user_id: user._id,
        ...req.body,
    });
    return res.json(consumption_doc);
};

module.exports.update_consumption = async (req, res) => {
    const { user } = res.locals;

    if (req.body.status) {
        const schema = Joi.object({
            consumption_id: Joi.string().required(),
            total_quantity: Joi.number().required(),
            weight_measurement: Joi.string().required(),
            purchased_from_market: Joi.number().required(),
            purchased_from_neighbours: Joi.number().required(),
            self_grown: Joi.number().required(),
            status: Joi.number().required().allow(0, 1),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const consumption_doc = await Consumption.findByIdAndUpdate(
            value.consumption_id,
            {
                user_id: user._id,
                ...value,
            },
            { runValidators: true, new: true }
        );
        return res.json(consumption_doc);
    }
    const consumption_doc = await Consumption.findByIdAndUpdate(
        req.body.consumption_id,
        {
            user_id: user._id,
            ...req.body,
        }
    );
    return res.json(consumption_doc);
};

module.exports.delete_consumption = async (req, res) => {
    const { id } = req.params;
    const doc = await Consumption.findByIdAndDelete(id);
    return res.json({ message: "Consumption deleted!" });
};
