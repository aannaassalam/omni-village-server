const Joi = require("joi");
const Mobility = require("../Models/mobility");
const MobilityByUser = require("../Models/mobility-by-user");
const User = require("../Models/user");

module.exports.get_mobility_by_user = async (req, res) => {
    const { user } = res.locals;
    const mobility_by_user = await MobilityByUser.findOne({
        user_id: user._id,
    });
    return res.json(mobility_by_user);
};

module.exports.add_mobility_by_user = async (req, res) => {
    const { user } = res.locals;
    const schema = Joi.object({
        methods_of_mobility: Joi.array()
            .items(Joi.string().required())
            .required()
            .min(1),
        access_to_public_transport: Joi.string().equal("yes", "no").required(),
        number_of_vehicles: Joi.number().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const mobilities = await Mobility.insertMany(
        Array.from({ length: value.number_of_vehicles }, () => ({
            user_id: user._id,
        }))
    );

    const response = await MobilityByUser.create({
        user_id: user._id,
        ...value,
        mobilities: mobilities.map((_land) => _land._id),
    });

    await User.findByIdAndUpdate(user._id, {
        $set: {
            is_mobility_data: true,
        },
    });

    return res.json({
        message: "Mobility info submitted successfully",
        ...response._doc,
    });
};

module.exports.get_mobility_requirements = async (req, res) => {
    const { user } = res.locals;
    const mobility_requirements_by_user = await MobilityByUser.findOne(
        {
            user_id: user._id,
        },
        {
            vehicles_needed: 1,
        }
    );
    return res.json(mobility_requirements_by_user);
};

module.exports.edit_mobility_requirements = async (req, res) => {
    const { user } = res.locals;
    const schema = Joi.object({
        vehicle_requirement: Joi.boolean().required(),
        vehicles_needed: Joi.when("vehicle_requirement", {
            is: true,
            then: Joi.array()
                .items(
                    Joi.object({
                        purpose: Joi.string().required(),
                        vehicle_type: Joi.string().required(),
                        urgency: Joi.string().required(),
                    })
                )
                .required()
                .min(1),
            otherwise: Joi.array().items(
                Joi.object({
                    purpose: Joi.string().required(),
                    vehicle_type: Joi.string().required(),
                    urgency: Joi.string().required(),
                })
            ),
        }),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const mobility_requirements_by_user = await MobilityByUser.findOneAndUpdate(
        { user_id: user._id },
        {
            $set: value,
        }
    );

    return res.json(mobility_requirements_by_user);
};
