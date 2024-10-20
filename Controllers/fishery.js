const Fishery = require("../Models/fishery");
const Joi = require("joi");

module.exports.get_fishery = async (req, res) => {
    const { fishery_type } = req.params;
    const { user } = res.locals;

    const fishery_doc = await Fishery.aggregate([
        {
            $match: {
                user_id: user._id,
                fishery_type,
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
        // {
        //     $addFields: {
        //         "fishery_crop.name": `$fishery_crop.name.${language}`,
        //     },
        // },
    ]);
    return res.json(fishery_doc);
};

module.exports.add_fishery = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            crop_id: Joi.string().required(),
            number: Joi.number().required(),
            fishery_type: Joi.string().required(),
            create_type: Joi.string().optional().allow(null, ""),
            type_of_feed: Joi.when("fishery_type", {
                is: "pond",
                then: Joi.string().required(),
                otherwise: Joi.string().optional().allow(null, ""),
            }),
            total_feed: Joi.when("fishery_type", {
                is: "pond",
                then: Joi.number().required(),
                otherwise: Joi.number().optional().allow(null, ""),
            }),
            output: Joi.number().required(),
            weight_measurement: Joi.string().required(),
            self_consumed: Joi.number().required(),
            sold_to_neighbours: Joi.number().required(),
            sold_for_industrial_use: Joi.number().required(),
            wastage: Joi.number().required(),
            others: Joi.string().optional().allow(""),
            others_value: Joi.number().optional().allow(null),
            yield: Joi.number().required(),
            income_from_sale: Joi.number().required(),
            expenditure_on_inputs: Joi.number().required(),
            required_processing: Joi.boolean().required(),
            status: Joi.number().allow(1).allow(0).required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;
        const fishery_doc = await Fishery.create({
            user_id: user._id,
            ...value,
        });
        return res.json(fishery_doc);
    }
    const fishery_doc = await Fishery.create({
        user_id: user._id,
        ...req.body,
    });
    return res.json(fishery_doc);
};

module.exports.update_fishery = async (req, res) => {
    if (req.body.status) {
        const schema = Joi.object({
            fishery_id: Joi.string().required(),
            number: Joi.number().required(),
            fishery_type: Joi.string().required(),
            create_type: Joi.string().optional().allow(null, ""),
            type_of_feed: Joi.when("fishery_type", {
                is: "pond",
                then: Joi.string().required(),
                otherwise: Joi.string().optional().allow(null, ""),
            }),
            total_feed: Joi.when("fishery_type", {
                is: "pond",
                then: Joi.number().required(),
                otherwise: Joi.number().optional().allow(null, ""),
            }),
            output: Joi.number().required(),
            weight_measurement: Joi.string().required(),
            self_consumed: Joi.number().required(),
            sold_to_neighbours: Joi.number().required(),
            sold_for_industrial_use: Joi.number().required(),
            wastage: Joi.number().required(),
            others: Joi.string().optional().allow(""),
            others_value: Joi.number().optional().allow(null),
            yield: Joi.number().required(),
            income_from_sale: Joi.number().required(),
            expenditure_on_inputs: Joi.number().required(),
            required_processing: Joi.boolean().required(),
            status: Joi.number().allow(1).allow(0).required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;
        const fishery_doc = await Fishery.findByIdAndUpdate(
            value.fishery_id,
            value,
            { runValidators: true, new: true }
        );
        return res.json(fishery_doc);
    }
    const fishery_doc = await Fishery.findByIdAndUpdate(
        req.body.fishery_id,
        req.body,
        { runValidators: true, new: true }
    );
    return res.json(fishery_doc);
};

module.exports.delete_fishery = async (req, res) => {
    const { id } = req.params;
    const doc = await Fishery.findByIdAndDelete(id);
    return res.json({ message: "Fishery deleted!" });
};
