const Joi = require("joi");
const DemographicOfficer = require("../Models/demographic-officer");

module.exports.get_demographic_officer = async (req, res) => {
    const { user } = res.locals;
    const { village_id } = req.query;
    if (!village_id) throw new AppError(0, "Please provide village_id", 400);
    const data = await DemographicOfficer.findOne({
        moderator_id: user._id,
        village_id,
    });
    return res.json(data);
};

module.exports.add_demographic_officer = async (req, res) => {
    const { user } = res.locals;
    const upload_house_picture = req.files;
    const schema = Joi.object({
        village_id: Joi.string().required(),
        average_population_growth_rate: Joi.number().required(),
        common_land_measurement_unit: Joi.string().required(),
        how_much: Joi.number().required(),
        local_language: Joi.string().required(),
        common_traditional_house: Joi.string().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await DemographicOfficer.create({
        moderator_id: user._id,
        ...value,
        upload_house_picture: upload_house_picture.map((_file) => _file.path),
    });

    return res.json({
        message: "Demographic added successfully",
        ...data._doc,
    });
};

module.exports.edit_demographic_officer = async (req, res) => {
    const upload_house_picture = req.files;
    const schema = Joi.object({
        demographic_id: Joi.string().required(),
        average_population_growth_rate: Joi.number().required(),
        common_land_measurement_unit: Joi.string().required(),
        how_much: Joi.number().required(),
        local_language: Joi.string().required(),
        common_traditional_house: Joi.string().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    if (upload_house_picture?.length) {
        const data = await DemographicOfficer.findByIdAndUpdate(
            value.demographic_id,
            {
                ...value,
                upload_house_picture: upload_house_picture.map(
                    (_file) => _file.path
                ),
            }
        );

        return res.json({
            message: "Demographic edited successfully",
            ...data._doc,
        });
    }

    const data = await DemographicOfficer.findByIdAndUpdate(
        value.demographic_id,
        value
    );

    return res.json({
        message: "Demographic edited successfully",
        ...data._doc,
    });
};

module.exports.delete_demographic_officer = async (req, res) => {
    const { user } = res.locals;
    const { village_id } = req.query;
    const data = await DemographicOfficer.deleteMany({
        moderator_id: user._id,
        village_id,
    });
    return res.json({
        message: "Demographic deleted successfully",
        ...data._doc,
    });
};
