const Joi = require("joi");
const BusinessByUser = require("../Models/business-by-user");
const BusinessCommercial = require("../Models/business-commercial");
const User = require("../Models/user");
const mongoose = require("mongoose");

module.exports.add_business_by_user = async (req, res) => {
    const { user } = res.locals;
    const schema = Joi.object({
        other_business_apart_farming: Joi.boolean().required(),
        plan_to_start_business: Joi.boolean().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const business_by_user = await BusinessByUser.create({
        user_id: user._id,
        ...value,
    });

    await User.findByIdAndUpdate(user._id, {
        $set: {
            is_business_data: true,
        },
    });

    return res.json({
        message: "Business Commercial submitted successfully",
        ...business_by_user._doc,
    });
};

module.exports.edit_business_by_user = async (req, res) => {
    const { user } = res.locals;
    const schema = Joi.object({
        business_by_user_id: Joi.string().required(),
        other_business_apart_farming: Joi.boolean().required(),
        plan_to_start_business: Joi.boolean().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const business_by_user = await BusinessByUser.findByIdAndUpdate(
        value.business_by_user_id,
        value
    );

    await User.findByIdAndUpdate(user._id, {
        $set: {
            is_business_data: true,
        },
    });

    return res.json({
        message: "Business Commercial updated successfully",
        ...business_by_user._doc,
    });
};

module.exports.get_business_requirements = async (req, res) => {
    const { user } = res.locals;
    console.log(user);
    const business_requirements_by_user = await BusinessByUser.findOne(
        {
            user_id: user._id,
        },
        {
            business_wish_to_start: 1,
            require_land: 1,
            land_already_owned: 1,
            purpose_of_business: 1,
        }
    );
    return res.json(business_requirements_by_user);
};

module.exports.edit_business_requirements = async (req, res) => {
    const { user } = res.locals;
    const schema = Joi.object({
        business_wish_to_start: Joi.string().required(),
        require_land: Joi.string().required(),
        land_already_owned: Joi.string().required(),
        purpose_of_business: Joi.string().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const business_requirements_by_user = await BusinessByUser.findOneAndUpdate(
        { user_id: user._id },
        {
            $set: value,
        }
    );

    return res.json(business_requirements_by_user);
};
