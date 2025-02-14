const Joi = require("joi");
const Landholding = require("../Models/landholding");
const LandholdingByUser = require("../Models/landholding-by-user");
const User = require("../Models/user");

module.exports.get_landholding_by_user_data = async (req, res) => {
    const { user } = res.locals;

    const landholding_by_user = await LandholdingByUser.findOne(
        {
            user_id: user._id,
        },
        {
            land_requirements: 1,
        }
    );

    return res.json(landholding_by_user);
};

module.exports.add_landholding_by_user_data = async (req, res) => {
    const { user } = res.locals;
    const schema = Joi.object({
        land_requirements: Joi.boolean().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const landholding_by_user = await LandholdingByUser.create({
        user_id: user._id,
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

module.exports.edit_landholding_by_user_data = async (req, res) => {
    const schema = Joi.object({
        landholding_by_user_id: Joi.string().required(),
        land_requirements: Joi.boolean().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const landholding_by_user = await LandholdingByUser.findByIdAndUpdate(
        value.landholding_by_user_id,
        value
    );

    return res.json({
        message: "Landholding info updated successfully",
        ...landholding_by_user._doc,
    });
};

module.exports.get_landholding_requirements = async (req, res) => {
    const { user } = res.locals;
    const landholding_requirements_by_user = await LandholdingByUser.findOne(
        {
            user_id: user._id,
        },
        {
            required_area: 1,
            purpose_for_required_land: 1,
            other_purpose_of_land: 1,
            urgency_required_land: 1,
        }
    );
    return res.json(landholding_requirements_by_user);
};

module.exports.edit_landholding_requirements = async (req, res) => {
    const { user } = res.locals;
    const schema = Joi.object({
        required_area: Joi.number().required(),
        purpose_for_required_land: Joi.string().required().allow(""),
        other_purpose_of_land: Joi.string().optional().allow("", null),
        urgency_required_land: Joi.string().required().allow(""),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const landholding_requirements_by_user =
        await LandholdingByUser.findOneAndUpdate(
            { user_id: user._id },
            {
                $set: value,
            }
        );

    return res.json(landholding_requirements_by_user);
};
