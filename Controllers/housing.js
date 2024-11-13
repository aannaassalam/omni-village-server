const Joi = require("joi");
const Housing = require("../Models/housing");
const AppError = require("../AppError");

module.exports.get_housing = async (req, res) => {
    const { housing_id } = req.query;
    if (housing_id) {
        const housing = await Housing.findById(housing_id);
        return res.json(housing);
    }
    throw new AppError(0, "Please provide landholding_id", 400);
};

module.exports.update_housing = async (req, res) => {
    let front_photo,
        back_photo,
        neighbourhood_photo,
        inside_living_photo,
        kitchen_photo;

    if (req.files) {
        front_photo = req.files.front_photo?.[0]?.path;
        back_photo = req.files.back_photo?.[0]?.path;
        neighbourhood_photo = req.files.neighbourhood_photo?.[0]?.path;
        inside_living_photo = req.files.inside_living_photo?.[0]?.path;
        kitchen_photo = req.files.kitchen_photo?.[0]?.path;
    }

    if (req.body.status) {
        const schema = Joi.object({
            housing_id: Joi.string().required(),
            name_of_the_house: Joi.string().required(),
            type_of_house: Joi.number().required(),
            land_utilised_for_family_housing: Joi.number().required(),
            no_of_units_built: Joi.number().required(),
            total_built_area: Joi.number().required(),
            no_of_floors: Joi.number().required(),
            living_area: Joi.number().required(),
            year_built: Joi.string().required(),
            year_renovated: Joi.string().required(),
            year_last_expanded: Joi.string().required(),
            type: Joi.string().required(),
            amenities: Joi.array()
                .items(Joi.string().required())
                .required()
                .min(1),
            equipment: Joi.array()
                .items(Joi.string().required())
                .required()
                .min(1),
            furnishing: Joi.array()
                .items(Joi.string().required())
                .required()
                .min(1),
            renovation_requirement: Joi.boolean().required(),
            renovation_urgency: Joi.string().required(),
            expansion_requirement: Joi.boolean().required(),
            expansion_urgency: Joi.string().required(),
            status: Joi.number().allow(0, 1).required(),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        await Housing.findByIdAndUpdate(value.housing_id, {
            ...value,
            front_photo,
            back_photo,
            neighbourhood_photo,
            inside_living_photo,
            kitchen_photo,
        });

        return res.json({
            message: "Housing updated successfully",
        });
    }
    await Housing.findByIdAndUpdate(req.body.housing_id, {
        ...req.body,
        front_photo,
        back_photo,
        neighbourhood_photo,
        inside_living_photo,
        kitchen_photo,
    });

    return res.json({
        message: "Housing updated successfully",
    });
};
