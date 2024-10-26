const mongoose = require("mongoose");

const demograhicSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "User id is required!"],
        ref: "User",
    },
    marital_status: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    diet: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    height: {
        type: mongoose.Schema.Types.Number,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    weight: {
        type: mongoose.Schema.Types.Number,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    language_speak: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    language_read: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    language_write: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    occupation: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    yearly_income: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    bank_account: {
        type: mongoose.Schema.Types.Boolean,
        required: function () {
            return this.status === 1;
        },
        default: null,
    },
    savings_investment: {
        type: mongoose.Schema.Types.Boolean,
        required: function () {
            return this.status === 1;
        },
        default: null,
    },
    savings_investment_amount: {
        type: mongoose.Schema.Types.Number,
        default: 0,
    },
    chronic_disease: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    motor_disablity: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    currently_feeling: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    feelings_with_others: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    support_you_have: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    recover_from_stress: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    share_feelings_of_others: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    specific_habit: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    education_status: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    education_seeking_to_gain: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    cultural_traditional_hobbies: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    outdoor_nature_based_hobbies: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    modern_digital_hobbies: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    creative_artistics_hobbies: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    other_hobbies: {
        type: mongoose.Schema.Types.String,
        default: "",
    },
    technical_vocational_skills_learn: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    entrepreneurial_business_skills_learn: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    digital_technological_skills_learn: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    communication_language_skills_learn: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    health_well_being_skills_learn: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    creative_artistics_skills_learn: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    others_skills_learn: {
        type: mongoose.Schema.Types.String,
        default: "",
    },
    technical_vocational_skills: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    entrepreneurial_business_skills: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    interpersonal_skills: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    creative_artistic_skills: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    professional_skills: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    others: {
        type: mongoose.Schema.Types.String,
        default: "",
    },
    economic: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    educational: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    health_well_being: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    infrastructure_technology: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    environmental_sustainability: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    cultural: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    community_social: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    personal_growth: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    spiritual: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    basic_necessities: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    educational_needs: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    economic_needs: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    healthcare_needs: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    infrastructure_needs: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    social_governance_needs: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    environmental_needs: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: function () {
                return this.status === 1;
            },
            ref: "demographic_dropdown",
            default: null,
        },
    ],
    others: {
        type: mongoose.Schema.Types.String,
        default: "",
    },
    for_community: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    for_economy: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    for_personal_growth: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    for_environment: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    for_family_future_generation: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.status === 1;
        },
        ref: "demographic_dropdown",
        default: null,
    },
    others: {
        type: mongoose.Schema.Types.String,
        default: "",
    },
    status: {
        type: mongoose.Schema.Types.Number,
        default: 1,
        enum: [0, 1],
    },
});

module.exports = mongoose.model("Demographic", demograhicSchema);
