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
                "others.water_recycling_methods": 0,
                "others.water_meter": 0,
                "others.water_scarcity": 0,
                "others.water_scarcity_severity": 0,
                "others.type_of_harvesting": 0,
            },
        },
    ]);

    return res.json(water_by_user[0] || null);
};

module.exports.get_water_usage_info = async (req, res) => {
    const { water_id } = req.query;
    if (water_id) {
        const water = await Water.findById(water_id, {
            wastewater_disposal_methods: 0,
            water_recycling_methods: 0,
            water_meter: 0,
            water_scarcity: 0,
            water_scarcity_severity: 0,
            type_of_harvesting: 0,
        });
        return res.json(water);
    }
    throw new AppError(0, "Please provide a water_id", 400);
};

module.exports.add_water_usage_entry = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            type: Joi.string().required(),
            other_name: Joi.when("type", {
                is: "other",
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
