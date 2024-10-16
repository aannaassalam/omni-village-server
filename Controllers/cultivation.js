const Cultivation = require("../Models/cultivation");
const Crop = require("../Models/crop");
const moment = require("moment");
const Joi = require("joi");

const handleErrors = (err) => {
    let errors = {};
    return err;
};

module.exports.get_cultivation = async (req, res) => {
    const { language } = req.query;
    const { user } = res.locals;

    try {
        const cultivation_doc = await Cultivation.aggregate([
            {
                $lookup: {
                    from: "crops",
                    localField: "crop_id",
                    foreignField: "_id",
                    as: "cultivation_crop",
                },
            },
            {
                $match: {
                    user_id: user._id,
                },
            },
            { $unwind: { path: "$cultivation_crop" } },
            {
                $project: {
                    __v: 0,
                    "cultivation_crop.__v": 0,
                },
            },
            {
                $addFields: {
                    "cultivation_crop.name": `$cultivation_crop.name.${language}`,
                },
            },
        ]);
        res.json(cultivation_doc);
    } catch (err) {
        console.log(err);
        res.status(400).json(handleErrors(err));
    }
};

module.exports.get_all_cultivations = async (req, res) => {
    try {
        const cultivation_doc = await Cultivation.aggregate([
            {
                $lookup: {
                    from: "crops",
                    localField: "crop_id",
                    foreignField: "_id",
                    as: "crop",
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            {
                $lookup: {
                    from: "consumption_types",
                    localField: "crop.label",
                    foreignField: "_id",
                    as: "label",
                },
            },
            { $unwind: { path: "$crop" } },
            { $unwind: { path: "$user" } },
            { $unwind: { path: "$label" } },
            {
                $addFields: {
                    label_name: "$label.name.en",
                },
            },
            {
                $project: {
                    __v: 0,
                    "crop.__v": 0,
                },
            },
            {
                $sort: {
                    createdAt: -1,
                },
            },
        ]);
        console.log(cultivation_doc);
        res.json(cultivation_doc);
    } catch (err) {
        console.log(err);
        res.status(400).json(handleErrors(err));
    }
};

module.exports.add_cultivation = async (req, res) => {
    const { user } = res.locals;
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
        decreasing_rate: Joi.when("soil_health", {
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
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const cultivation_doc = await Cultivation.create({
        ...value,
        user_id: user._id,
    });
    res.json(cultivation_doc);
};

module.exports.update_cultivation = async (req, res) => {
    const {
        cultivation_id,
        area_allocated,
        output,
        weight_measurement,
        utilization,
        important_information,
        status,
    } = req.body;

    try {
        const cultivation_doc = await Cultivation.findByIdAndUpdate(
            cultivation_id,
            {
                area_allocated,
                output,
                weight_measurement,
                utilization,
                important_information,
                status,
            },
            { runValidators: true, new: true }
        );
        res.json(cultivation_doc);
    } catch (err) {
        res.status(400).json(handleErrors(err));
    }
};

module.exports.delete_cultivation = async (req, res) => {
    const { id } = req.params;
    try {
        const doc = await Cultivation.findByIdAndDelete(id);
        // console.log(doc);
        if (doc) {
            res.json({ message: "Cultivation deleted!" });
        } else {
            res.status(400).json({ message: "Something went wrong!" });
        }
    } catch (err) {
        res.status(400).json(handleErrors(err));
    }
};

module.exports.cultivation_list = async (req, res) => {
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
            $unwind: {
                path: "$crop",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "user_id",
                foreignField: "_id",
                as: "user",
            },
        },

        {
            $unwind: {
                path: "$user",
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
    ]);
    // const processed_cultivations = {};
    // cultivations.forEach((cultivation) => {
    //   const date = moment(cultivation.createdAt).format("LL");
    //   processed_cultivations[date] = processed_cultivations[date]
    //     ? [...processed_cultivations[date], cultivation]
    //     : [cultivation];
    // });
    res.json(cultivations);

    // res.render("cultivations", {
    //   cultivations: processed_cultivations,
    // });
};
