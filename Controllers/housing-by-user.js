const Joi = require("joi");
const Housing = require("../Models/housing");
const HousingByUser = require("../Models/housing-by-user");
const User = require("../Models/user");

module.exports.get_housing_by_user = async (req, res) => {
    const { user } = res.locals;
    const housing_by_user = await HousingByUser.findOne({
        user_id: user._id,
    });
    return res.json(housing_by_user);
};

module.exports.add_housing_by_user_data = async (req, res) => {
    const { user } = res.locals;
    const schema = Joi.object({
        total_numbers_of_house: Joi.number().required(),
        house_requirements: Joi.boolean().required(),
    });

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
