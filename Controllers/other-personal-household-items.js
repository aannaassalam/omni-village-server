const Joi = require("joi");
const PersonalHousehold = require("../Models/other-personal-household-items");
const AppError = require("../AppError");

module.exports.get_personal_household_items = async (req, res) => {
    const { user } = res.locals;
    const { type } = req.query;

    if (type) {
        const data = await PersonalHousehold.findOne({
            type,
            user_id: user._id,
        });

        return res.json(data);
    }
    throw new AppError(0, "Please provide a type", 400);
};

module.exports.add_personal_household_items = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            type: Joi.string()
                .required()
                .equal(
                    "personal_care_items",
                    "cleaning_products",
                    "office_supplies",
                    "medicine",
                    "kitchen_items",
                    "other_items"
                ),
            personal_care_item_use: Joi.array()
                .items(Joi.string().required())
                .required()
                .min(1),
            yearly_expense_for_personal_care: Joi.number().required(),
            items_produced_locally: Joi.boolean().required(),
            items_produces: Joi.when("items_produced_locally", {
                is: true,
                then: Joi.array()
                    .items(
                        Joi.object({
                            type: Joi.string().required(),
                            quantity: Joi.number().required(),
                        }).required()
                    )
                    .required()
                    .min(1),
                otherwise: Joi.array()
                    .items(
                        Joi.object({
                            type: Joi.string().required(),
                            quantity: Joi.number().required(),
                        }).required()
                    )
                    .optional(),
            }),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const response = await PersonalHousehold.create({
            user_id: user._id,
            ...value,
        });

        return res.json({
            message:
                "Other personal and household information added successfully",
            ...response._doc,
        });
    }

    const response = await PersonalHousehold.create({
        user_id: user._id,
        ...req.body,
    });

    return res.json({
        message: "Other personal and household information added successfully",
        ...response._doc,
    });
};

module.exports.edit_personal_household_items = async (req, res) => {
    if (req.body.status) {
        const schema = Joi.object({
            personal_household_id: Joi.string().required(),
            personal_care_item_use: Joi.array()
                .items(Joi.string().required())
                .required()
                .min(1),
            yearly_expense_for_personal_care: Joi.number().required(),
            items_produced_locally: Joi.boolean().required(),
            items_produces: Joi.when("items_produced_locally", {
                is: true,
                then: Joi.array()
                    .items(
                        Joi.object({
                            type: Joi.string().required(),
                            quantity: Joi.number().required(),
                        }).required()
                    )
                    .required()
                    .min(1),
                otherwise: Joi.array()
                    .items(
                        Joi.object({
                            type: Joi.string().required(),
                            quantity: Joi.number().required(),
                        }).required()
                    )
                    .optional(),
            }),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const response = await PersonalHousehold.findByIdAndUpdate(
            value.personal_household_id,
            value,
            { new: true, runValidators: true }
        );

        return res.json({
            message:
                "Other personal and household information updated successfully",
            ...response._doc,
        });
    }

    const response = await PersonalHousehold.findByIdAndUpdate(
        req.body.personal_household_id,
        req.body,
        { new: true, runValidators: true }
    );

    return res.json({
        message:
            "Other personal and household information updated successfully",
        ...response._doc,
    });
};
