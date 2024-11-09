const Joi = require("joi");
const Landholding = require("../Models/landholding");
const LandholdingByUser = require("../Models/landholding-by-user");
const User = require("../Models/user");

module.exports.get_landholding_by_user = async (req, res) => {
    const user = req.user;
    const landholding_by_user = await LandholdingByUser.findOne({
        user_id: user._id,
    });
    return res.json(landholding_by_user);
};

module.exports.add_landholding_by_user_data = async (req, res) => {
    const user = req.user;
    const schema = Joi.object({
        total_numbers_of_lands: Joi.number().required(),
        land_requirements: Joi.boolean().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const landholdings = await Landholding.insertMany(
        Array.from({ length: value.total_numbers_of_lands }, () => ({
            user_id: user._id,
        }))
    );

    const landholding_by_user = await LandholdingByUser.create({
        user_id: user._id,
        landholdings: landholdings.map((_land) => _land._id),
        ...value,
    });

    await User.findByIdAndUpdate(user._id, {
        $set: {
            is_landholding_data: true,
        },
    });

    return res.json({
        message: "Landholding info submitted successfully",
        ...landholding_by_user._doc,
    });
};
