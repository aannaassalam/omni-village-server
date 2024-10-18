const Cultivation = require("../Models/cultivation");
const Crop = require("../Models/crop");
const moment = require("moment");
const Joi = require("joi");

module.exports.get_cultivation = async (req, res) => {
    const { language } = req.query;
    const { user } = res.locals;

    const cultivations = await Cultivation.aggregate([
        {
            $lookup: {
                from: "crops",
                localField: "crop_id",
                foreignField: "_id",
                as: "crop",
            },
        },
        {
            $match: {
                user_id: user._id,
            },
        },
        { $unwind: { path: "crop" } },
        // {
        //     $addFields: {
        //         "cultivation_crop.name": `$cultivation_crop.name.${language}`,
        //     },
        // },
    ]);
    return res.json(cultivations);
};

module.exports.add_cultivation = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            crop_id: Joi.string().required(),
            area_allocated: Joi.number().required(),
            output: Joi.number().required(),
            weight_measurement: Joi.string().required(),
            self_consumed: Joi.number().required(),
            fed_to_livestock: Joi.number().required(),
            sold_to_neighbours: Joi.number().required(),
            sold_for_industrial_use: Joi.number().required(),
            wastage: Joi.number().required(),
            other: Joi.string().optional().allow(""),
            other_value: Joi.number().optional(),
            soil_health: Joi.string().required(),
            decreasing_yeild: Joi.when("soil_health", {
                is: "decreasing yield",
                then: Joi.number().required(),
                otherwise: Joi.number().optional(),
            }),
            type_of_fertilizer_used: Joi.string().required(),
            type_of_pesticide_used: Joi.string().required(),
            income_from_sale: Joi.number().required(),
            expenditure_on_inputs: Joi.number().required(),
            description: Joi.string().optional().allow(""),
            yeild: Joi.number().required(),
            month_planted: Joi.date().required(),
            month_harvested: Joi.date().required(),
            status: Joi.number().allow(0).allow(1).required(),
            required_processing: Joi.boolean().required(),
            processing_method: Joi.string(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const cultivation_doc = await Cultivation.create({
            ...value,
            user_id: user._id,
        });
        return res.json(cultivation_doc);
    }
    const cultivation_doc = await Cultivation.create({
        ...req.body,
        user_id: user._id,
    });
    return res.json(cultivation_doc);
};

module.exports.update_cultivation = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            cultivation_id: Joi.string().required(),
            area_allocated: Joi.number().required(),
            output: Joi.number().required(),
            weight_measurement: Joi.string().required(),
            self_consumed: Joi.number().required(),
            fed_to_livestock: Joi.number().required(),
            sold_to_neighbours: Joi.number().required(),
            sold_for_industrial_use: Joi.number().required(),
            wastage: Joi.number().required(),
            other: Joi.string().optional().allow(""),
            other_value: Joi.number().optional(),
            soil_health: Joi.string().required(),
            decreasing_yeild: Joi.when("soil_health", {
                is: "decreasing yield",
                then: Joi.number().required(),
                otherwise: Joi.number().optional(),
            }),
            type_of_fertilizer_used: Joi.string().required(),
            type_of_pesticide_used: Joi.string().required(),
            income_from_sale: Joi.number().required(),
            expenditure_on_inputs: Joi.number().required(),
            description: Joi.string().optional().allow(""),
            yeild: Joi.number().required(),
            month_planted: Joi.date().required(),
            month_harvested: Joi.date().required(),
            status: Joi.number().allow(0).allow(1).required(),
            required_processing: Joi.boolean().required(),
            processing_method: Joi.string(),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const cultivation_doc = await Cultivation.findByIdAndUpdate(
            value.cultivation_id,
            value,
            { runValidators: true, new: true }
        );
        return res.json(cultivation_doc);
    }
    const cultivation_doc = await Cultivation.findByIdAndUpdate(
        req.body.cultivation_id,
        req.body,
        { runValidators: true, new: true }
    );
    return res.json(cultivation_doc);
};

module.exports.delete_cultivation = async (req, res) => {
    const { id } = req.params;
    const doc = await Cultivation.findByIdAndDelete(id);
    return res.json({ message: "Cultivation deleted!" });
};
