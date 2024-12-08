const Joi = require("joi");
const CommunityOfficer = require("../Models/community-officer");

module.exports.get_community_officer = async () => {
    const { user } = res.locals;
    const data = await CommunityOfficer.findOne({ moderator_id: user._id });
    return res.json(data);
};

module.exports.add_community_officer = async (req, res) => {
    const { user } = res.locals;
    const { upload_house_picture } = req.files;
    const schema = Joi.object({
        average_population_growth_rate: Joi.number().required(),
        common_land_measurement_unit: Joi.string().required(),
        how_much: Joi.number().required(),
        local_language: Joi.string().required(),
        common_traditional_house: Joi.string().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await CommunityOfficer.create({
        moderator_id: user._id,
        ...value,
        upload_house_picture: upload_house_picture.map((_file) => _file.path),
    });

    return res.json({
        message: "Community added successfully",
        ...data._doc,
    });
};

module.exports.edit_community_officer = async (req, res) => {
    const { upload_house_picture } = req.files;
    const schema = Joi.object({
        demographic_id: Joi.string().required(),
        average_population_growth_rate: Joi.number().required(),
        common_land_measurement_unit: Joi.string().required(),
        how_much: Joi.number().required(),
        local_language: Joi.string().required(),
        common_traditional_house: Joi.string().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await CommunityOfficer.findByIdAndUpdate(
        value.demographic_id,
        {
            ...value,
            upload_house_picture: upload_house_picture.map(
                (_file) => _file.path
            ),
        }
    );

    return res.json({
        message: "Community edited successfully",
        ...data._doc,
    });
};

module.exports.delete_community_officer = async (req, res) => {
    const { user } = res.locals;
    const data = await CommunityOfficer.deleteMany({
        moderator_id: user._id,
    });
    return res.json({
        message: "Community deleted successfully",
        ...data._doc,
    });
};
