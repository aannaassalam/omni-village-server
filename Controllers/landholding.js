const Joi = require("joi");
const Landholding = require("../Models/landholding");
const AppError = require("../AppError");

module.exports.get_landholding_by_user = async (req, res) => {
    const { user } = res.locals;
    const landholding_by_user = await Landholding.find({
        user_id: user._id,
    });
    return res.json(landholding_by_user);
};

module.exports.get_landholding = async (req, res) => {
    const { landholding_id } = req.query;
    if (landholding_id) {
        const landholding = await Landholding.findById(landholding_id);
        return res.json(landholding);
    }
    throw new AppError(0, "Please provide landholding_id", 400);
};

module.exports.add_landholding = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            land_located: Joi.string().required(),
            total_land_area: Joi.number().required(),
            year_purchased: Joi.number().required(),
            geotag: Joi.string().required(),
            land_under_use: Joi.boolean().required(),
            purpose_land_utilised_for: Joi.array()
                .items(
                    Joi.object({
                        type: Joi.string().required(),
                        type_category: Joi.array()
                            .items(Joi.string().required())
                            .min(1)
                            .required(),
                        total_land_area_utilised: Joi.number().required(),
                    })
                )
                .optional(),
            purpose_status_of_land: Joi.array()
                .items(
                    Joi.object({
                        type: Joi.string().required(),
                        type_category: Joi.array()
                            .items(Joi.string().required())
                            .min(1)
                            .required(),
                        total_land_area_utilised: Joi.number().required(),
                    })
                )
                .optional(),
            status: Joi.number().allow(0, 1).required(),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        await Landholding.create({
            user_id: user._id,
            ...value,
        });

        return res.json({
            message: "Landholding added successfully",
        });
    }
    await Landholding.create({ user_id: user._id, ...req.body });

    return res.json({
        message: "Landholding added successfully",
    });
};

module.exports.update_landholding = async (req, res) => {
    if (req.body.status) {
        const schema = Joi.object({
            landholding_id: Joi.string().required(),
            land_located: Joi.string().required(),
            total_land_area: Joi.number().required(),
            year_purchased: Joi.number().required(),
            geotag: Joi.string().required(),
            land_under_use: Joi.boolean().required(),
            purpose_land_utilised_for: Joi.array()
                .items(
                    Joi.object({
                        type: Joi.string().required(),
                        type_category: Joi.array()
                            .items(Joi.string().required())
                            .min(1)
                            .required(),
                        total_land_area_utilised: Joi.number().required(),
                    })
                )
                .optional(),
            purpose_status_of_land: Joi.array()
                .items(
                    Joi.object({
                        type: Joi.string().required(),
                        type_category: Joi.array()
                            .items(Joi.string().required())
                            .min(1)
                            .required(),
                        total_land_area_utilised: Joi.number().required(),
                    })
                )
                .optional(),
            status: Joi.number().allow(0, 1).required(),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        await Landholding.findByIdAndUpdate(value.landholding_id, value);

        return res.json({
            message: "Landholding updated successfully",
        });
    }
    await Landholding.findByIdAndUpdate(req.body.landholding_id, req.body);

    return res.json({
        message: "Landholding updated successfully",
    });
};

module.exports.delete_landholding = async (req, res) => {
    const { id } = req.query;
    await Landholding.findByIdAndDelete(id);
    return res.json({
        message: "Landholding deleted successfully",
    });
};
