const Joi = require("joi");
const Housing = require("../Models/housing");
const HousingByUser = require("../Models/housing-by-user");
const User = require("../Models/user");
const mongoose = require("mongoose");

module.exports.get_housing_by_user = async (req, res) => {
    const { user } = res.locals;
    const housing_by_user = await HousingByUser.aggregate([
        {
            $match: {
                user_id: new mongoose.Types.ObjectId(user._id),
            },
        },
        {
            $lookup: {
                from: "housings",
                foreignField: "_id",
                localField: "housings",
                as: "housings",
            },
        },
    ]);
    return res.json(housing_by_user);
};

module.exports.add_housing_by_user_data = async (req, res) => {
    const { user } = res.locals;
    const schema = Joi.object({
        total_numbers_of_house: Joi.number().required(),
        house_requirements: Joi.boolean().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const housings = await Housing.insertMany(
        Array.from({ length: value.total_numbers_of_house }, () => ({
            user_id: user._id,
        }))
    );

    const housing_by_user = await HousingByUser.create({
        user_id: user._id,
        housings: housings.map((_land) => _land._id),
        ...value,
    });

    await User.findByIdAndUpdate(user._id, {
        $set: {
            is_housing_data: true,
        },
    });

    return res.json({
        message: "Housing info submitted successfully",
        ...housing_by_user._doc,
    });
};

module.exports.get_housing_requirements = async (req, res) => {
    const { user } = res.locals;
    const housing_requirements_by_user = await HousingByUser.findOne(
        {
            user_id: user._id,
        },
        {
            need_new_unit: 1,
            new_unit_purpose: 1,
            new_unit_urgency: 1,
            land_for_new_unit: 1,
            required_area: 1,
        }
    );
    return res.json(housing_requirements_by_user);
};

module.exports.edit_housing_requirements = async (req, res) => {
    const { user } = res.locals;
    const schema = Joi.object({
        need_new_unit: Joi.boolean().required(),
        new_unit_purpose: Joi.string().required(),
        new_unit_urgency: Joi.string().required(),
        land_for_new_unit: Joi.boolean().required(),
        required_area: Joi.number().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const housing_requirements_by_user = await HousingByUser.findOneAndUpdate(
        { user_id: user._id },
        {
            $set: value,
        }
    );

    return res.json(housing_requirements_by_user);
};
