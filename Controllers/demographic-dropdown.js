const Joi = require("joi");
const DemographicDropdown = require("../Models/demographic-dropdown");

module.exports.get_demographic_dropdowns = async (req, res) => {
    const { language = "en" } = req.query;
    const data = await DemographicDropdown.aggregate([
        {
            $addFields: {
                name: `$name.${language}`,
            },
        },
        {
            $group: {
                _id: "$type",
                data: { $push: "$$ROOT" },
            },
        },
    ]);

    const final_obj = data.reduce((prev, current) => {
        prev[current._id] = current.data;
        return prev;
    }, {});
    res.json(final_obj);
};

module.exports.add_demographic_data = async (req, res) => {
    const schema = Joi.object({
        name: Joi.object({
            en: Joi.string().required(),

            ms: Joi.string().optional().allow("", null),

            dz: Joi.string().optional().allow("", null),
        }).required(),
        type: Joi.string()
            .required()
            .equal(
                "marital_status",
                "diet",
                "language",
                "occupation",
                "yearly_income",
                "chronic_diseases",
                "motor_disability",
                "overall_wellbeing",
                "communication_of_feelings",
                "support_system",
                "stress_and_resilience",
                "empathy",
                "habbits",
                "current_education_status",
                "education_seeking_to_gain",
                "technical_and_vocational_skills",
                "professional_skills",
                "entrepreneurical_and_business_skills",
                "interpersonal_skills",
                "creative_and_artistic_skills",
                "cultural_and_traditional_hobbies",
                "outdoor_and_nature_based_hobbies",
                "modern_and_digital_hobbies",
                "creative_and_artistic_hobbies",
                "technical_and_vocational_skills_learn",
                "entrepreneurial_and_business_skills_learn",
                "digital_and_technological_skills_learn",
                "communication_and_language_skills_learn",
                "health_and_wellbeing_skills_learn",
                "creative_and_artistic_skills_learn",
                "economic_aspirations",
                "educational_aspirations",
                "health_and_wellbeing_aspirations",
                "infrastructure_and_technology_aspirations",
                "environmental_and_sustainability_aspirations",
                "cultural_aspirations",
                "community_and_social_aspirations",
                "aspiration_for_personal_growth",
                "spiritual_aspiration"
            ),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const data = await DemographicDropdown.create({
        ...value,
        name: {
            en: value.name.en,
            ms: value.name.ms || value.name.en,
            dz: value.name.dz || value.name.en,
        },
    });

    return res.json({
        message: "Dropdown added successfully",
        ...data._doc,
    });
};
