const mongoose = require("mongoose");

const demographicDropdownSchema = new mongoose.Schema(
    {
        name: {
            en: {
                type: mongoose.Schema.Types.String,
                required: [true, "Please Enter a Demographic dropdown name!"],
                set: (value) => value.toLowerCase(),
            },

            ms: {
                type: mongoose.Schema.Types.String,
                default: "",
                // unique: true,
                set: (value) => value.toLowerCase(),
            },

            dz: {
                type: mongoose.Schema.Types.String,
                default: "",
                // unique: true,
                set: (value) => value.toLowerCase(),
            },
        },
        type: {
            type: String,
            required: true,
            enum: [
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
                "spiritual_aspiration",
            ],
        },
        status: {
            type: mongoose.Schema.Types.Number,
            default: 0,
            required: [
                true,
                "Status is required!(0 - from user & 1 - from admin or approved)",
            ],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model(
    "demographic_dropdown",
    demographicDropdownSchema
);
