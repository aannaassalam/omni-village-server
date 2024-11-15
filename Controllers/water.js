const { default: mongoose } = require("mongoose");
const WaterByUser = require("../Models/water-by-user");
const Joi = require("joi");
const Water = require("../Models/water");
const AppError = require("../AppError");

module.exports.get_water_by_user = async (req, res) => {
    const { user } = res.locals;
    const water_by_user = await WaterByUser.aggregate([
        {
            $match: {
                user_id: user._id,
            },
        },
        {
            $lookup: {
                from: "waters",
                foreignField: "_id",
                localField: "others.water_id",
                as: "others",
            },
        },
        {
            $project: {
                "others.wastewater_disposal_methods": 0,
                "others.water_recycle": 0,
                "others.water_recycling_methods": 0,
                "others.water_meter": 0,
                "others.water_scarcity": 0,
                "others.water_scarcity_severity": 0,
                "others.months_of_year_of_scarcity": 0,
                "others.type_of_harvesting": 0,
            },
        },
    ]);

    return res.json(water_by_user[0] || null);
};

module.exports.get_water_usage_info = async (req, res) => {
    const { water_id } = req.query;
    if (water_id) {
        const water = await Water.findOne(
            {
                _id: water_id,
                type: {
                    $in: [
                        "cooking_and_drinking",
                        "sanitation_and_bathing",
                        "cleaning",
                        "irrigation",
                        "others",
                    ],
                },
            },
            {
                type_of_harvesting: 0,
                wastewater_disposal_methods: 0,
                water_recycle: 0,
                water_recycling_methods: 0,
                water_meter: 0,
                water_scarcity: 0,
                water_scarcity_severity: 0,
                months_of_year_of_scarcity: 0,
            }
        );
        return res.json(water);
    }
    throw new AppError(0, "Please provide a water_id", 400);
};

module.exports.get_water_harvesting_capacity = async (req, res) => {
    const { water_id } = req.query;
    if (water_id) {
        const water = await Water.findOne(
            { _id: water_id, type: "water_harvesting_capacity" },
            {
                yearly_consumption: 0,
                water_sourced_from: 0,
                water_quality: 0,
                expense: 0,
                other_name: 0,
                wastewater_disposal_methods: 0,
                water_recycle: 0,
                water_recycling_methods: 0,
                water_meter: 0,
                water_scarcity: 0,
                water_scarcity_severity: 0,
                months_of_year_of_scarcity: 0,
            }
        );
        return res.json(water);
    }
    throw new AppError(0, "Please provide a water_id", 400);
};

module.exports.get_wastewater_disposal = async (req, res) => {
    const { water_id } = req.query;
    if (water_id) {
        const water = await Water.findOne(
            { _id: water_id, type: "waste_water_disposal" },
            {
                yearly_consumption: 0,
                water_sourced_from: 0,
                water_quality: 0,
                expense: 0,
                other_name: 0,
                type_of_harvesting: 0,
                water_meter: 0,
                water_scarcity: 0,
                water_scarcity_severity: 0,
                months_of_year_of_scarcity: 0,
            }
        );
        return res.json(water);
    }
    throw new AppError(0, "Please provide a water_id", 400);
};

module.exports.get_general_info = async (req, res) => {
    const { water_id } = req.query;
    if (water_id) {
        const water = await Water.findOne(
            { _id: water_id, type: "general_information" },
            {
                yearly_consumption: 0,
                water_sourced_from: 0,
                water_quality: 0,
                expense: 0,
                other_name: 0,
                type_of_harvesting: 0,
                wastewater_disposal_methods: 0,
                water_recycle: 0,
                water_recycling_methods: 0,
            }
        );
        return res.json(water);
    }
    throw new AppError(0, "Please provide a water_id", 400);
};

module.exports.add_water_usage_entry = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            type: Joi.string()
                .required()
                .equal(
                    "cooking_and_drinking",
                    "sanitation_and_bathing",
                    "cleaning",
                    "irrigation",
                    "others"
                ),
            other_name: Joi.when("type", {
                is: "others",
                then: Joi.string().required(),
                otherwise: Joi.string().optional().allow(""),
            }),
            yearly_consumption: Joi.string().required(),
            water_sourced_from: Joi.array()
                .items(Joi.string().required())
                .required()
                .min(1),
            water_quality: Joi.string().required(),
            expense: Joi.number().required(),
            status: Joi.number().required().allow(0, 1),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const water_data = await Water.create({
            user_id: user._id,
            ...value,
        });

        const update_document =
            value.type === "others"
                ? {
                      $push: {
                          others: {
                              water_id: water_data._id,
                              isDrafted: false,
                          },
                      },
                  }
                : {
                      [value.type]: {
                          water_id: water_data._id,
                          isDrafted: false,
                      },
                  };

        await WaterByUser.findOneAndUpdate(
            { user_id: user._id },
            update_document,
            {
                runValidators: true,
                new: true,
                upsert: true,
            }
        );

        return res.json({
            message: "Water information added successfully",
            ...water_data._doc,
        });
    }

    const water_data = await Water.create({
        user_id: user._id,
        ...req.body,
    });

    const update_document =
        value.type === "others"
            ? {
                  $push: {
                      others: {
                          water_id: water_data._id,
                          isDrafted: true,
                      },
                  },
              }
            : {
                  [req.body.type]: {
                      water_id: water_data._id,
                      isDrafted: true,
                  },
              };

    await WaterByUser.findOneAndUpdate({ user_id: user._id }, update_document, {
        runValidators: true,
        new: true,
        upsert: true,
    });

    return res.json({
        message: "Water information added successfully",
        ...water_data._doc,
    });
};

module.exports.add_water_harvesting_capacity = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            type: Joi.string().required().equal("water_harvesting_capacity"),
            type_of_harvesting: Joi.array()
                .items(
                    Joi.object({
                        type: Joi.string().required(),
                        capacity: Joi.number().required(),
                    }).required()
                )
                .required()
                .min(1),
            status: Joi.number().required().allow(0, 1),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const water_data = await Water.create({
            user_id: user._id,
            ...value,
        });

        await WaterByUser.findOneAndUpdate(
            { user_id: user._id },
            {
                water_harvesting_capacity: {
                    water_id: water_data._id,
                    isDrafted: false,
                },
            },
            {
                runValidators: true,
                new: true,
                upsert: true,
            }
        );

        return res.json({
            message: "Water information added successfully",
            ...water_data._doc,
        });
    }

    const water_data = await Water.create({
        user_id: user._id,
        ...req.body,
    });

    await WaterByUser.findOneAndUpdate(
        { user_id: user._id },
        {
            water_harvesting_capacity: {
                water_id: water_data._id,
                isDrafted: true,
            },
        },
        {
            runValidators: true,
            new: true,
            upsert: true,
        }
    );

    return res.json({
        message: "Water information added successfully",
        ...water_data._doc,
    });
};

module.exports.add_wastewater_disposal = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            type: Joi.string().required().equal("waste_water_disposal"),
            wastewater_disposal_methods: Joi.array()
                .items(Joi.string().required())
                .required()
                .min(1),
            water_recycle: Joi.boolean().required(),
            water_recycling_methods: Joi.when("water_recycle", {
                is: true,
                then: Joi.array()
                    .items(Joi.string().required())
                    .required()
                    .min(1),
                otherwise: Joi.array()
                    .items(Joi.string().required())
                    .optional(),
            }),
            status: Joi.number().required().allow(0, 1),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const water_data = await Water.create({
            user_id: user._id,
            ...value,
        });

        await WaterByUser.findOneAndUpdate(
            { user_id: user._id },
            {
                waste_water_disposal: {
                    water_id: water_data._id,
                    isDrafted: false,
                },
            },
            {
                runValidators: true,
                new: true,
                upsert: true,
            }
        );

        return res.json({
            message: "Water information added successfully",
            ...water_data._doc,
        });
    }

    const water_data = await Water.create({
        user_id: user._id,
        ...req.body,
    });

    await WaterByUser.findOneAndUpdate(
        { user_id: user._id },
        {
            waste_water_disposal: {
                water_id: water_data._id,
                isDrafted: true,
            },
        },
        {
            runValidators: true,
            new: true,
            upsert: true,
        }
    );

    return res.json({
        message: "Water information added successfully",
        ...water_data._doc,
    });
};

module.exports.add_general_info = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            type: Joi.string().required().equal("general_information"),
            water_meter: Joi.boolean().required(),
            water_scarcity: Joi.boolean().required(),
            water_scarcity_severity: Joi.when("water_scarcity", {
                is: true,
                then: Joi.string().required(),
                otherwise: Joi.string().optional().allow(""),
            }),
            months_of_year_of_scarcity: Joi.when("water_scarcity", {
                is: true,
                then: Joi.array()
                    .items(Joi.string().required())
                    .required()
                    .min(1),
                otherwise: Joi.array()
                    .items(Joi.string().required())
                    .optional(),
            }),
            status: Joi.number().required().allow(0, 1),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const water_data = await Water.create({
            user_id: user._id,
            ...value,
        });

        await WaterByUser.findOneAndUpdate(
            { user_id: user._id },
            {
                general_information: {
                    water_id: water_data._id,
                    isDrafted: false,
                },
            },
            {
                runValidators: true,
                new: true,
                upsert: true,
            }
        );

        return res.json({
            message: "Water information added successfully",
            ...water_data._doc,
        });
    }

    const water_data = await Water.create({
        user_id: user._id,
        ...req.body,
    });

    await WaterByUser.findOneAndUpdate(
        { user_id: user._id },
        {
            general_information: {
                water_id: water_data._id,
                isDrafted: true,
            },
        },
        {
            runValidators: true,
            new: true,
            upsert: true,
        }
    );

    return res.json({
        message: "Water information added successfully",
        ...water_data._doc,
    });
};

module.exports.edit_water_usage_entry = async (req, res) => {
    if (req.body.status) {
        const schema = Joi.object({
            water_id: Joi.string().required(),
            type: Joi.string()
                .required()
                .equal(
                    "cooking_and_drinking",
                    "sanitation_and_bathing",
                    "cleaning",
                    "irrigation",
                    "others"
                ),
            other_name: Joi.when("type", {
                is: "others",
                then: Joi.string().required(),
                otherwise: Joi.string().optional().allow(""),
            }),
            yearly_consumption: Joi.string().required(),
            water_sourced_from: Joi.array()
                .items(Joi.string().required())
                .required()
                .min(1),
            water_quality: Joi.string().required(),
            expense: Joi.number().required(),
            status: Joi.number().required().allow(0, 1),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const water_data = await Water.findByIdAndUpdate(
            value.water_id,
            value,
            { new: true, runValidators: true }
        );

        await WaterByUser.findOneAndUpdate(
            { user_id: user._id },
            {
                [value.type]: {
                    isDrafted: false,
                },
            },
            {
                runValidators: true,
                new: true,
                upsert: true,
            }
        );

        return res.json({
            message: "Water information updated successfully",
            ...water_data._doc,
        });
    }

    const water_data = await Water.findByIdAndUpdate(
        req.body.water_id,
        req.body,
        {
            new: true,
            runValidators: true,
        }
    );

    await WaterByUser.findOneAndUpdate(
        { user_id: user._id },
        {
            [req.body.type]: {
                isDrafted: true,
            },
        },
        {
            runValidators: true,
            new: true,
            upsert: true,
        }
    );

    return res.json({
        message: "Water information updated successfully",
        ...water_data._doc,
    });
};

module.exports.edit_water_harvesting_capacity = async (req, res) => {
    if (req.body.status) {
        const schema = Joi.object({
            water_id: Joi.string().required(),
            type_of_harvesting: Joi.array()
                .items(
                    Joi.object({
                        type: Joi.string().required(),
                        capacity: Joi.number().required(),
                    }).required()
                )
                .required()
                .min(1),
            status: Joi.number().required().allow(0, 1),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const water_data = await Water.findByIdAndUpdate(
            value.water_id,
            value,
            { new: true, runValidators: true }
        );

        await WaterByUser.findOneAndUpdate(
            { user_id: user._id },
            {
                [value.type]: {
                    isDrafted: false,
                },
            },
            {
                runValidators: true,
                new: true,
                upsert: true,
            }
        );

        return res.json({
            message: "Water information updated successfully",
            ...water_data._doc,
        });
    }

    const water_data = await Water.findByIdAndUpdate(
        req.body.water_id,
        req.body,
        {
            runValidators: true,
            new: true,
        }
    );

    await WaterByUser.findOneAndUpdate(
        { user_id: user._id },
        {
            [req.body.type]: {
                isDrafted: true,
            },
        },
        {
            runValidators: true,
            new: true,
            upsert: true,
        }
    );

    return res.json({
        message: "Water information updated successfully",
        ...water_data._doc,
    });
};

module.exports.edit_wastewater_disposal = async (req, res) => {
    if (req.body.status) {
        const schema = Joi.object({
            water_id: Joi.string().required(),
            wastewater_disposal_methods: Joi.array()
                .items(Joi.string().required())
                .required()
                .min(1),
            water_recycle: Joi.boolean().required(),
            water_recycling_methods: Joi.when("water_recycle", {
                is: true,
                then: Joi.array()
                    .items(Joi.string().required())
                    .required()
                    .min(1),
                otherwise: Joi.array()
                    .items(Joi.string().required())
                    .optional(),
            }),
            status: Joi.number().required().allow(0, 1),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const water_data = await Water.findByIdAndUpdate(
            value.water_id,
            value,
            { new: true, runValidators: true }
        );

        await WaterByUser.findOneAndUpdate(
            { user_id: user._id },
            {
                [value.type]: {
                    isDrafted: false,
                },
            },
            {
                runValidators: true,
                new: true,
                upsert: true,
            }
        );

        return res.json({
            message: "Water information updated successfully",
            ...water_data._doc,
        });
    }

    const water_data = await Water.findByIdAndUpdate(
        req.body.water_id,
        req.body,
        { new: true, runValidators: true }
    );

    await WaterByUser.findOneAndUpdate(
        { user_id: user._id },
        {
            [req.body.type]: {
                isDrafted: true,
            },
        },
        {
            runValidators: true,
            new: true,
            upsert: true,
        }
    );

    return res.json({
        message: "Water information updated successfully",
        ...water_data._doc,
    });
};

module.exports.edit_general_info = async (req, res) => {
    if (req.body.status) {
        const schema = Joi.object({
            water_id: Joi.string().required(),
            water_meter: Joi.boolean().required(),
            water_scarcity: Joi.boolean().required(),
            water_scarcity_severity: Joi.when("water_scarcity", {
                is: true,
                then: Joi.string().required(),
                otherwise: Joi.string().optional().allow(""),
            }),
            months_of_year_of_scarcity: Joi.when("water_scarcity", {
                is: true,
                then: Joi.array()
                    .items(Joi.string().required())
                    .required()
                    .min(1),
                otherwise: Joi.array()
                    .items(Joi.string().required())
                    .optional(),
            }),
            status: Joi.number().required().allow(0, 1),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const water_data = await Water.findByIdAndUpdate(
            value.water_id,
            value,
            { runValidators: true, new: true }
        );

        await WaterByUser.findOneAndUpdate(
            { user_id: user._id },
            {
                [value.type]: {
                    isDrafted: false,
                },
            },
            {
                runValidators: true,
                new: true,
                upsert: true,
            }
        );

        return res.json({
            message: "Water information updated successfully",
            ...water_data._doc,
        });
    }

    const water_data = await Water.findByIdAndUpdate(
        req.body.water_id,
        req.body,
        { runValidators: true, new: true }
    );

    await WaterByUser.findOneAndUpdate(
        { user_id: user._id },
        {
            [req.body.type]: {
                isDrafted: true,
            },
        },
        {
            runValidators: true,
            new: true,
            upsert: true,
        }
    );

    return res.json({
        message: "Water information updated successfully",
        ...water_data._doc,
    });
};
