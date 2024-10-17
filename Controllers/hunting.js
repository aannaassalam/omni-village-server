const Hunting = require("../Models/hunting");
const Joi = require("joi");

module.exports.get_hunting = async (req, res) => {
    const { user } = res.locals;

    const hunting_doc = await Hunting.aggregate([
        {
            $match: {
                user_id: user._id,
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
        { $unwind: { path: "$crop" } },
    ]);
    return res.json(hunting_doc);
};

module.exports.add_hunting = async (req, res) => {
    const { user } = res.locals;
    const schema = Joi.object({
        crop_id: Joi.string().required(),
        number_hunted: Joi.number().required(),
        meat: Joi.number().required(),
        self_consumed: Joi.number().required(),
        sold_to_neighbours: Joi.number().required(),
        sold_in_consumer_market: Joi.number().required(),
        weight_measurement: Joi.string().required(),
        wastage: Joi.number().required(),
        others: Joi.string().optional().allow(""),
        others_value: Joi.number().optional(),
        income_from_sale: Joi.number().required(),
        expenditure_on_inputs: Joi.number().required(),
        yeild: Joi.number().required(),
        required_processing: Joi.boolean().required(),
        status: Joi.number().allow(1).allow(0).required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const hunting_doc = await Hunting.create({
        user_id: user._id,
        ...value,
    });
    return res.json(hunting_doc);
};

module.exports.update_hunting = async (req, res) => {
    const schema = Joi.object({
        hunting_id: Joi.string().required(),
        number_hunted: Joi.number().required(),
        meat: Joi.number().required(),
        self_consumed: Joi.number().required(),
        sold_to_neighbours: Joi.number().required(),
        sold_in_consumer_market: Joi.number().required(),
        weight_measurement: Joi.string().required(),
        wastage: Joi.number().required(),
        others: Joi.string().optional().allow(""),
        others_value: Joi.number().optional(),
        income_from_sale: Joi.number().required(),
        expenditure_on_inputs: Joi.number().required(),
        yeild: Joi.number().required(),
        required_processing: Joi.boolean().required(),
        status: Joi.number().allow(1).allow(0).required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const hunting_doc = await Hunting.findByIdAndUpdate(
        value.hunting_id,
        value,
        { runValidators: true, new: true }
    );
    return res.json(hunting_doc);
};

module.exports.delete_hunting = async (req, res) => {
    const { id } = req.params;
    const doc = await Hunting.findByIdAndDelete(id);
    return res.json({ message: "Hunting deleted!" });
};
