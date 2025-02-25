const Cultivation = require("../Models/cultivation");
const Crop = require("../Models/crop");
const moment = require("moment");

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
        res.json(cultivation_doc);
    } catch (err) {
        console.log(err);
        res.status(400).json(handleErrors(err));
    }
};

module.exports.add_cultivation = async (req, res) => {
    const {
        crop_id,
        area_allocated,
        output,
        weight_measurement,
        utilization,
        important_information,
        status,
    } = req.body;
    const { user } = res.locals;

    try {
        const cultivation_doc = await Cultivation.create({
            crop_id,
            user_id: user._id,
            area_allocated,
            output,
            weight_measurement,
            utilization,
            important_information,
            status,
        });
        res.json(cultivation_doc);
    } catch (err) {
        res.status(400).json(handleErrors(err));
    }
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
