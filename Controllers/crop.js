const Joi = require("joi");
const Crop = require("../Models/crop");
const csvtojson = require("csvtojson");

const handleErrors = (err) => {
    let errors = {};
    if (err.code === 11000) {
        errors.name = "Crop already exists!";
        return errors;
    }
    return err;
};

module.exports.get_crops = async (req, res) => {
    const { language, country, category } = req.query;
    const crops = await Crop.aggregate([
        {
            $match: {
                country: country.toLowerCase(),
                category: {
                    $in: Array.isArray(category) ? category : [category],
                },
            },
        },
        {
            $lookup: {
                from: "consumption_type",
                localField: "label",
                foreignField: "_id",
                as: "label",
            },
        },
        { $unwind: { path: "$label", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                name: `$name.${language}`,
                country: 1,
                status: 1,
                label: 1,
                category: 1,
                // "label.name": "$label.name.en",
            },
        },
    ]);
    res.json(crops);
};

module.exports.get_all = async (req, res) => {
    const { language } = req.query;
    try {
        const crops = await Crop.aggregate([
            {
                $lookup: {
                    from: "consumption_types",
                    localField: "label",
                    foreignField: "_id",
                    as: "label",
                },
            },
            {
                $unwind: {
                    path: "$label",
                    preserveNullAndEmptyArrays: true,
                },
            },
        ]);
        res.json(crops);
    } catch (err) {
        res.status(400).json(handleErrors(err));
    }
};

module.exports.add_crop = async (req, res) => {
    const { language } = req.query;
    const schema = Joi.object({
        name: Joi.object({
            en: Joi.string().required(),
            ms: Joi.string().optional().allow(""),
            dz: Joi.string().optional().allow(""),
        }).required(),
        country: Joi.array().items(Joi.string().required()).min(1),
        status: Joi.number().allow(1).allow(0).required(),
        label: Joi.string().optional().allow(""),
        ideal_consumption_per_person: Joi.number().optional(),
        category: Joi.string().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const crop_doc = await Crop.create({
        ...value,
        name: {
            en: value.name.en,
            ms: value.name.ms || value.name.en,
            dz: value.name.dz || value.name.en,
        },
    });
    return res.json({ ...crop_doc._doc, name: crop_doc.name[language] });
};

module.exports.bulk_upload = async (req, res) => {
    const file = req.file.path;
    try {
        const data = await csvtojson().fromFile(file);
        const hoo = await Crop.insertMany(data, {
            rawResult: true,
        });
        return res.json({
            inserted: hoo.insertedCount,
            failed: data.length - hoo.insertedCount,
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({
                message: `Duplicate Data found in csv file. Data can be found at row number - ${
                    err.writeErrors[0].index + 1
                }. Please remove the rows before row ${
                    err.writeErrors[0].index + 1
                } along with the duplicate entry.`,
            });
        }
        if (err.name === "ValidationError")
            return res.status(400).json({
                message: err.message,
            });
        return res.status(400).json(err);
    }
};

module.exports.edit_crop = async (req, res) => {
    const {
        name,
        crop_id,
        country,
        status,
        label,
        ideal_consumption_per_person,
    } = req.body;
    const { language } = req.query;
    try {
        const crop_doc = await Crop.findByIdAndUpdate(
            crop_id,
            {
                name: {
                    en: name.en,
                    ms: name.ms || name.en,
                    dz: name.dz || name.en,
                },
                label,
                country,
                status,
                ideal_consumption_per_person,
            },
            { new: true, runValidators: true }
        );
        res.json({ ...crop_doc._doc, name: crop_doc.name[language] });
    } catch (err) {
        console.log(err);
        res.status(400).json(handleErrors(err));
    }
};

module.exports.delete_crop = async (req, res) => {
    const { id } = req.params;
    try {
        const crop_doc = await Crop.findByIdAndDelete(id);
        res.json(crop_doc);
    } catch (err) {
        res.status(400).json(handleErrors(err));
    }
};
