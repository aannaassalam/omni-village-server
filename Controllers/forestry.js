const Joi = require("joi");
const Forestry = require("../Models/forestry");
const AppError = require("../AppError");

module.exports.get_forestry_info = async (req, res) => {
    const { user } = res.locals;
    const { type } = req.query;

    const getDataByType = () => {
        switch (type) {
            case "general":
                return {
                    timber_needs: 0,
                    quantity: 0,
                    purpose: 0,
                    urgency: 0,
                    unfulfilled_forest_needs: 0,
                    forestry_type: 0,
                };
            case "timber_needs":
                return {
                    land_owned_under_forest_cover: 0,
                    timber_logs_harvested: 0,
                    own_forest_cover_land: 0,
                    community_forest: 0,
                    other_produced_harvested_from_forest: 0,
                    unfulfilled_forest_needs: 0,
                    forestry_type: 0,
                };
            case "other_needs":
                return {
                    land_owned_under_forest_cover: 0,
                    timber_logs_harvested: 0,
                    own_forest_cover_land: 0,
                    community_forest: 0,
                    other_produced_harvested_from_forest: 0,
                    timber_needs: 0,
                    quantity: 0,
                    purpose: 0,
                    urgency: 0,
                };
        }
    };

    if (type) {
        const forestry = await Forestry.findOne(
            { user_id: user._id, type },
            getDataByType()
        );
        return res.json(forestry);
    }
    throw new AppError(0, "Please provide a type", 400);
};

module.exports.add_general_information = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            land_owned_under_forest_cover: Joi.number().required(),
            timber_logs_harvested: Joi.number().required(),
            own_forest_cover_land: Joi.number().required(),
            community_forest: Joi.number().required(),
            other_produced_harvested_from_forest: Joi.array().items(
                Joi.object({
                    type: Joi.string().required(),
                    quantity: Joi.number().required(),
                    purpose: Joi.array()
                        .items(Joi.string().required())
                        .required()
                        .min(1),
                }).required()
            ),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const forestry = await Forestry.create({
            user_id: user._id,
            type: "general",
            ...value,
        });
        return res.json({
            message: "Forestry added successfully",
            ...forestry._doc,
        });
    }

    const forestry = await Forestry.create({
        user_id: user._id,
        type: "general",
        ...req.body,
    });
    return res.json({
        message: "Forestry added successfully",
        ...forestry._doc,
    });
};

module.exports.add_timber_needs = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            timber_needs: Joi.boolean().required(),
            quantity: Joi.number().optional(),
            purpose: Joi.array().items(Joi.string().required()).optional(),
            // urgency: Joi.string().optional().allow(""),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const forestry = await Forestry.create({
            user_id: user._id,
            type: "timber_needs",
            ...value,
        });
        return res.json({
            message: "Forestry added successfully",
            ...forestry._doc,
        });
    }

    const forestry = await Forestry.create({
        user_id: user._id,
        type: "timber_needs",
        ...req.body,
    });
    return res.json({
        message: "Forestry added successfully",
        ...forestry._doc,
    });
};

module.exports.add_other_needs = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            unfulfilled_forest_needs: Joi.boolean().required(),
            forestry_type: Joi.array()
                .items(
                    Joi.object({
                        type: Joi.string().optional().allow(""),
                        quantity: Joi.number().optional(),
                        quantity_unit: Joi.string().optional(),
                        purpose: Joi.array()
                            .items(Joi.string().required())
                            .optional(),
                        urgency: Joi.string().optional().allow(""),
                    })
                )
                .optional(),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const forestry = await Forestry.create({
            user_id: user._id,
            type: "other_needs",
            ...value,
        });
        return res.json({
            message: "Forestry added successfully",
            ...forestry._doc,
        });
    }

    const forestry = await Forestry.create({
        user_id: user._id,
        type: "other_needs",
        ...req.body,
    });
    return res.json({
        message: "Forestry added successfully",
        ...forestry._doc,
    });
};

module.exports.edit_general_information = async (req, res) => {
    if (req.body.status) {
        const schema = Joi.object({
            forestry_id: Joi.string().required(),
            land_owned_under_forest_cover: Joi.number().required(),
            timber_logs_harvested: Joi.number().required(),
            own_forest_cover_land: Joi.number().required(),
            community_forest: Joi.number().required(),
            other_produced_harvested_from_forest: Joi.array().items(
                Joi.object({
                    type: Joi.string().required(),
                    quantity: Joi.number().required(),
                    purpose: Joi.array()
                        .items(Joi.string().required())
                        .required()
                        .min(1),
                }).required()
            ),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const forestry = await Forestry.findByIdAndUpdate(
            value.forestry_id,
            value,
            {
                new: true,
                runValidators: true,
            }
        );
        return res.json({
            message: "Forestry updated successfully",
            ...forestry._doc,
        });
    }

    const forestry = await Forestry.findByIdAndUpdate(
        req.body.forestry_id,
        req.body,
        {
            new: true,
            runValidators: true,
        }
    );
    return res.json({
        message: "Forestry updated successfully",
        ...forestry._doc,
    });
};

module.exports.edit_timber_needs = async (req, res) => {
    if (req.body.status) {
        const schema = Joi.object({
            forestry_id: Joi.string().required(),
            timber_needs: Joi.boolean().required(),
            quantity: Joi.number().optional(),
            purpose: Joi.array().items(Joi.string().required()).optional(),
            // urgency: Joi.string().optional().allow(""),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const forestry = await Forestry.findByIdAndUpdate(
            value.forestry_id,
            value,
            {
                new: true,
                runValidators: true,
            }
        );
        return res.json({
            message: "Forestry updated successfully",
            ...forestry._doc,
        });
    }

    const forestry = await Forestry.findByIdAndUpdate(
        req.body.forestry_id,
        req.body,
        {
            new: true,
            runValidators: true,
        }
    );
    return res.json({
        message: "Forestry updated successfully",
        ...forestry._doc,
    });
};

module.exports.edit_other_needs = async (req, res) => {
    if (req.body.status) {
        const schema = Joi.object({
            forestry_id: Joi.string().required(),
            unfulfilled_forest_needs: Joi.boolean().required(),
            forestry_type: Joi.array()
                .items(
                    Joi.object({
                        type: Joi.string().optional().allow(""),
                        quantity: Joi.number().optional(),
                        quantity_unit: Joi.string().optional(),
                        purpose: Joi.array()
                            .items(Joi.string().required())
                            .optional(),
                        urgency: Joi.string().optional().allow(""),
                    })
                )
                .optional(),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const forestry = await Forestry.findByIdAndUpdate(
            value.forestry_id,
            value,
            {
                new: true,
                runValidators: true,
            }
        );
        return res.json({
            message: "Forestry updated successfully",
            ...forestry._doc,
        });
    }

    const forestry = await Forestry.findByIdAndUpdate(
        req.body.forestry_id,
        req.body,
        {
            new: true,
            runValidators: true,
        }
    );
    return res.json({
        message: "Forestry updated successfully",
        ...forestry._doc,
    });
};
