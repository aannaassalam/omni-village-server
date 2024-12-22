const Joi = require("joi");
const Demographic = require("../Models/demographicInfo");
const User = require("../Models/user");
const { Types } = require("mongoose");

exports.add_demographic_info = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            member_id: Joi.string().required(),
            marital_status: Joi.string().required(),
            diet: Joi.string().required(),
            height: Joi.number().required(),
            weight: Joi.number().required(),
            language_speak: Joi.string().required(),
            language_read: Joi.string().required(),
            language_write: Joi.string().required(),
            occupation: Joi.string().required(),
            yearly_income: Joi.string().required(),
            bank_account: Joi.boolean().required(),
            savings_investment: Joi.boolean().required(),
            savings_investment_amount: Joi.number().allow(null),
            chronic_disease: Joi.array()
                .items(Joi.string().required())
                .required(),
            motor_disablity: Joi.string().required(),
            currently_feeling: Joi.string().required(),
            feelings_with_others: Joi.string().required(),
            support_you_have: Joi.array()
                .items(Joi.string().required())
                .required(),
            recover_from_stress: Joi.string().required(),
            share_feelings_of_others: Joi.string().required(),
            specific_habit: Joi.string().required(),
            education_status: Joi.string().required(),
            education_seeking_to_gain: Joi.string().required(),
            cultural_traditional_hobbies: Joi.array()
                .items(Joi.string().required())
                .required(),
            outdoor_nature_based_hobbies: Joi.array()
                .items(Joi.string().required())
                .required(),
            modern_digital_hobbies: Joi.array()
                .items(Joi.string().required())
                .required(),
            creative_artistics_hobbies: Joi.array()
                .items(Joi.string().required())
                .required(),
            other_hobbies: Joi.string().optional().allow(null, ""),
            technical_vocational_skills_learn: Joi.array()
                .items(Joi.string().required())
                .required(),
            entrepreneurial_business_skills_learn: Joi.array()
                .items(Joi.string().required())
                .required(),
            digital_technological_skills_learn: Joi.array()
                .items(Joi.string().required())
                .required(),
            communication_language_skills_learn: Joi.array()
                .items(Joi.string().required())
                .required(),
            health_well_being_skills_learn: Joi.array()
                .items(Joi.string().required())
                .required(),
            creative_artistics_skills_learn: Joi.array()
                .items(Joi.string().required())
                .required(),
            others_skills_learn: Joi.string().optional().allow(null, ""),
            technical_vocational_skills: Joi.array()
                .items(Joi.string().required())
                .required(),
            entrepreneurial_business_skills: Joi.array()
                .items(Joi.string().required())
                .required(),
            interpersonal_skills: Joi.array()
                .items(Joi.string().required())
                .required(),
            creative_artistic_skills: Joi.array()
                .items(Joi.string().required())
                .required(),
            professional_skills: Joi.array()
                .items(Joi.string().required())
                .required(),
            others_skills: Joi.string().optional().allow(null, ""),
            economic: Joi.array().items(Joi.string().required()).required(),
            educational: Joi.array().items(Joi.string().required()).required(),
            health_well_being: Joi.array()
                .items(Joi.string().required())
                .required(),
            infrastructure_technology: Joi.array()
                .items(Joi.string().required())
                .required(),
            environmental_sustainability: Joi.array()
                .items(Joi.string().required())
                .required(),
            cultural: Joi.array().items(Joi.string().required()).required(),
            community_social: Joi.array()
                .items(Joi.string().required())
                .required(),
            personal_growth: Joi.array()
                .items(Joi.string().required())
                .required(),
            spiritual: Joi.array().items(Joi.string().required()).required(),
            unfulfilled_needs: Joi.string().optional().allow(null, ""),
            wishes: Joi.string().optional().allow(null, ""),
            status: Joi.number().required().allow(0, 1),
            other_occupation: Joi.string().optional().allow(""),
            other_chronic: Joi.string().optional().allow(""),
            other_motor: Joi.string().optional().allow(""),
            other_habit: Joi.string().optional().allow(""),
            other_education_status: Joi.string().optional().allow(""),
            other_education_seeking: Joi.string().optional().allow(""),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;
        const demographic_info = await Demographic.create({
            user_id: user._id,
            ...value,
        });
        const updated_members = user.members.map((_member) => {
            if (_member._id.toString() === value.member_id) {
                _member.demographic_id = demographic_info._id;
            }
            return _member;
        });
        await User.findByIdAndUpdate(user._id, {
            members: updated_members,
        });
        return res.status(200).json({
            success: true,
            message: "Demographic information added successfully",
            data: demographic_info,
        });
    }

    const demographic_info = await Demographic.create({
        user_id: user._id,
        ...req.body,
    });
    const updated_members = user.members.map((_member) => {
        if (_member._id.toString() === req.body.member_id) {
            _member.demographic_id = demographic_info._id;
        }
        return _member;
    });
    await User.findByIdAndUpdate(user._id, {
        members: updated_members,
    });
    return res.status(200).json({
        success: true,
        message: "Demographic information added successfully",
        data: demographic_info,
    });
};

exports.get_demographic_info_by_user_id = async (req, res) => {
    const { user } = res.locals;
    const { demographic_id } = req.query;
    const data = await Demographic.aggregate([
        {
            $match: {
                _id: new Types.ObjectId(demographic_id),
            },
        },
        {
            $facet: {
                general_data: [
                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "marital_status",
                            foreignField: "_id",
                            as: "marital_status",
                        },
                    },
                    {
                        $unwind: {
                            path: "$marital_status",
                            preserveNullAndEmptyArrays: true,
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "diet",
                            foreignField: "_id",
                            as: "diet",
                        },
                    },
                    {
                        $unwind: {
                            path: "$diet",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "occupation",
                            foreignField: "_id",
                            as: "occupation",
                        },
                    },
                    {
                        $unwind: {
                            path: "$occupation",
                            preserveNullAndEmptyArrays: true,
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "yearly_income",
                            foreignField: "_id",
                            as: "yearly_income",
                        },
                    },
                    {
                        $unwind: {
                            path: "$yearly_income",
                            preserveNullAndEmptyArrays: true,
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "chronic_disease",
                            foreignField: "_id",
                            as: "chronic_disease",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "motor_disablity",
                            foreignField: "_id",
                            as: "motor_disablity",
                        },
                    },
                    {
                        $unwind: {
                            path: "$motor_disablity",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "specific_habit",
                            foreignField: "_id",
                            as: "specific_habit",
                        },
                    },
                    {
                        $unwind: {
                            path: "$specific_habit",
                            preserveNullAndEmptyArrays: true,
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "education_status",
                            foreignField: "_id",
                            as: "education_status",
                        },
                    },
                    {
                        $unwind: {
                            path: "$education_status",
                            preserveNullAndEmptyArrays: true,
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "education_seeking_to_gain",
                            foreignField: "_id",
                            as: "education_seeking_to_gain",
                        },
                    },
                    {
                        $unwind: {
                            path: "$education_seeking_to_gain",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $project: {
                            marital_status: 1,
                            diet: 1,
                            height: 1,
                            weight: 1,
                            bank_account: 1,
                            savings_investment: 1,
                            savings_investment_amount: 1,
                            occupation: 1,
                            yearly_income: 1,
                            chronic_disease: 1,
                            motor_disablity: 1,
                            specific_habit: 1,
                            education_status: 1,
                            education_seeking_to_gain: 1,
                            status: 1,
                            unfulfilled_needs: 1,
                            wishes: 1,
                        },
                    },
                ],
                language: [
                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "language_speak",
                            foreignField: "_id",
                            as: "language_speak",
                        },
                    },
                    {
                        $unwind: {
                            path: "$language_speak",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "language_read",
                            foreignField: "_id",
                            as: "language_read",
                        },
                    },
                    {
                        $unwind: {
                            path: "$language_read",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "language_write",
                            foreignField: "_id",
                            as: "language_write",
                        },
                    },
                    {
                        $unwind: {
                            path: "$language_write",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $project: {
                            language_read: 1,
                            language_speak: 1,
                            language_write: 1,
                        },
                    },
                ],
                mental_and_emotional_wellbeing: [
                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "currently_feeling",
                            foreignField: "_id",
                            as: "currently_feeling",
                        },
                    },
                    {
                        $unwind: {
                            path: "$currently_feeling",
                            preserveNullAndEmptyArrays: true,
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "feelings_with_others",
                            foreignField: "_id",
                            as: "feelings_with_others",
                        },
                    },
                    {
                        $unwind: {
                            path: "$feelings_with_others",
                            preserveNullAndEmptyArrays: true,
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "support_you_have",
                            foreignField: "_id",
                            as: "support_you_have",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "recover_from_stress",
                            foreignField: "_id",
                            as: "recover_from_stress",
                        },
                    },
                    {
                        $unwind: {
                            path: "$recover_from_stress",
                            preserveNullAndEmptyArrays: true,
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "share_feelings_of_others",
                            foreignField: "_id",
                            as: "share_feelings_of_others",
                        },
                    },
                    {
                        $unwind: {
                            path: "$share_feelings_of_others",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $project: {
                            currently_feeling: 1,
                            feelings_with_others: 1,
                            support_you_have: 1,
                            recover_from_stress: 1,
                            share_feelings_of_others: 1,
                        },
                    },
                ],
                hobbies: [
                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "cultural_traditional_hobbies",
                            foreignField: "_id",
                            as: "cultural_traditional_hobbies",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "outdoor_nature_based_hobbies",
                            foreignField: "_id",
                            as: "outdoor_nature_based_hobbies",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "modern_digital_hobbies",
                            foreignField: "_id",
                            as: "modern_digital_hobbies",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "creative_artistics_hobbies",
                            foreignField: "_id",
                            as: "creative_artistics_hobbies",
                        },
                    },
                    {
                        $project: {
                            cultural_traditional_hobbies: 1,
                            outdoor_nature_based_hobbies: 1,
                            modern_digital_hobbies: 1,
                            creative_artistics_hobbies: 1,
                            other_hobbies: 1,
                        },
                    },
                ],
                skills_to_learn: [
                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "technical_vocational_skills_learn",
                            foreignField: "_id",
                            as: "technical_vocational_skills_learn",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "entrepreneurial_business_skills_learn",
                            foreignField: "_id",
                            as: "entrepreneurial_business_skills_learn",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "digital_technological_skills_learn",
                            foreignField: "_id",
                            as: "digital_technological_skills_learn",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "communication_language_skills_learn",
                            foreignField: "_id",
                            as: "communication_language_skills_learn",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "health_well_being_skills_learn",
                            foreignField: "_id",
                            as: "health_well_being_skills_learn",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "creative_artistics_skills_learn",
                            foreignField: "_id",
                            as: "creative_artistics_skills_learn",
                        },
                    },
                    {
                        $project: {
                            technical_vocational_skills_learn: 1,
                            entrepreneurial_business_skills_learn: 1,
                            digital_technological_skills_learn: 1,
                            communication_language_skills_learn: 1,
                            health_well_being_skills_learn: 1,
                            creative_artistics_skills_learn: 1,
                            others_skills_learn: 1,
                        },
                    },
                ],
                skills: [
                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "technical_vocational_skills",
                            foreignField: "_id",
                            as: "technical_vocational_skills",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "entrepreneurial_business_skills",
                            foreignField: "_id",
                            as: "entrepreneurial_business_skills",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "interpersonal_skills",
                            foreignField: "_id",
                            as: "interpersonal_skills",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "creative_artistic_skills",
                            foreignField: "_id",
                            as: "creative_artistic_skills",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "professional_skills",
                            foreignField: "_id",
                            as: "professional_skills",
                        },
                    },
                    {
                        $project: {
                            technical_vocational_skills: 1,
                            entrepreneurial_business_skills: 1,
                            interpersonal_skills: 1,
                            creative_artistic_skills: 1,
                            professional_skills: 1,
                            others_skills: 1,
                        },
                    },
                ],
                aspiration: [
                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "economic",
                            foreignField: "_id",
                            as: "economic",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "educational",
                            foreignField: "_id",
                            as: "educational",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "health_well_being",
                            foreignField: "_id",
                            as: "health_well_being",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "infrastructure_technology",
                            foreignField: "_id",
                            as: "infrastructure_technology",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "environmental_sustainability",
                            foreignField: "_id",
                            as: "environmental_sustainability",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "cultural",
                            foreignField: "_id",
                            as: "cultural",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "community_social",
                            foreignField: "_id",
                            as: "community_social",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "personal_growth",
                            foreignField: "_id",
                            as: "personal_growth",
                        },
                    },

                    {
                        $lookup: {
                            from: "demographic_dropdowns",
                            localField: "spiritual",
                            foreignField: "_id",
                            as: "spiritual",
                        },
                    },
                    {
                        $project: {
                            economic: 1,
                            educational: 1,
                            health_well_being: 1,
                            infrastructure_technology: 1,
                            environmental_sustainability: 1,
                            cultural: 1,
                            community_social: 1,
                            personal_growth: 1,
                            spiritual: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: {
                path: "$general_data",
            },
        },
        {
            $unwind: {
                path: "$mental_and_emotional_wellbeing",
            },
        },
        {
            $unwind: {
                path: "$hobbies",
            },
        },
        {
            $unwind: {
                path: "$skills_to_learn",
            },
        },
        {
            $unwind: {
                path: "$skills",
            },
        },
        {
            $unwind: {
                path: "$aspiration",
            },
        },
        // {
        //     $unwind: {
        //         path: "$data",
        //     },
        // },
    ]);
    res.status(200).json({
        success: true,
        message: "Info got successfully",
        data: data[0],
    });
};

exports.update_demographic_info_by_user_id = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            demographic_id: Joi.string().required(),
            marital_status: Joi.string().required(),
            diet: Joi.string().required(),
            height: Joi.number().required(),
            weight: Joi.number().required(),
            language_speak: Joi.string().required(),
            language_read: Joi.string().required(),
            language_write: Joi.string().required(),
            occupation: Joi.string().required(),
            yearly_income: Joi.string().required(),
            bank_account: Joi.boolean().required(),
            savings_investment: Joi.boolean().required(),
            savings_investment_amount: Joi.number().allow(null),
            chronic_disease: Joi.array()
                .items(Joi.string().required())
                .required(),
            motor_disablity: Joi.string().required(),
            currently_feeling: Joi.string().required(),
            feelings_with_others: Joi.string().required(),
            support_you_have: Joi.array()
                .items(Joi.string().required())
                .required(),
            recover_from_stress: Joi.string().required(),
            share_feelings_of_others: Joi.string().required(),
            specific_habit: Joi.string().required(),
            education_status: Joi.string().required(),
            education_seeking_to_gain: Joi.string().required(),
            cultural_traditional_hobbies: Joi.array()
                .items(Joi.string().required())
                .required(),
            outdoor_nature_based_hobbies: Joi.array()
                .items(Joi.string().required())
                .required(),
            modern_digital_hobbies: Joi.array()
                .items(Joi.string().required())
                .required(),
            creative_artistics_hobbies: Joi.array()
                .items(Joi.string().required())
                .required(),
            other_hobbies: Joi.string().optional().allow(null, ""),
            technical_vocational_skills_learn: Joi.array()
                .items(Joi.string().required())
                .required(),
            entrepreneurial_business_skills_learn: Joi.array()
                .items(Joi.string().required())
                .required(),
            digital_technological_skills_learn: Joi.array()
                .items(Joi.string().required())
                .required(),
            communication_language_skills_learn: Joi.array()
                .items(Joi.string().required())
                .required(),
            health_well_being_skills_learn: Joi.array()
                .items(Joi.string().required())
                .required(),
            creative_artistics_skills_learn: Joi.array()
                .items(Joi.string().required())
                .required(),
            others_skills_learn: Joi.string().optional().allow(null, ""),
            technical_vocational_skills: Joi.array()
                .items(Joi.string().required())
                .required(),
            entrepreneurial_business_skills: Joi.array()
                .items(Joi.string().required())
                .required(),
            interpersonal_skills: Joi.array()
                .items(Joi.string().required())
                .required(),
            creative_artistic_skills: Joi.array()
                .items(Joi.string().required())
                .required(),
            professional_skills: Joi.array()
                .items(Joi.string().required())
                .required(),
            others_skills: Joi.string().optional().allow(null, ""),
            economic: Joi.array().items(Joi.string().required()).required(),
            educational: Joi.array().items(Joi.string().required()).required(),
            health_well_being: Joi.array()
                .items(Joi.string().required())
                .required(),
            infrastructure_technology: Joi.array()
                .items(Joi.string().required())
                .required(),
            environmental_sustainability: Joi.array()
                .items(Joi.string().required())
                .required(),
            cultural: Joi.array().items(Joi.string().required()).required(),
            community_social: Joi.array()
                .items(Joi.string().required())
                .required(),
            personal_growth: Joi.array()
                .items(Joi.string().required())
                .required(),
            spiritual: Joi.array().items(Joi.string().required()).required(),
            unfulfilled_needs: Joi.string().optional().allow(null, ""),
            wishes: Joi.string().optional().allow(null, ""),
            status: Joi.number().required().allow(0, 1),
            other_occupation: Joi.string().optional().allow(""),
            other_chronic: Joi.string().optional().allow(""),
            other_motor: Joi.string().optional().allow(""),
            other_habit: Joi.string().optional().allow(""),
            other_education_status: Joi.string().optional().allow(""),
            other_education_seeking: Joi.string().optional().allow(""),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;
        const demographic_info = await Demographic.findByIdAndUpdate(
            value.demographic_id,
            value
        );
        return res.status(200).json({
            success: true,
            message: "Demographic information updated successfully",
            data: demographic_info,
        });
    }

    const demographic_info = await Demographic.findByIdAndUpdate(
        req.body.demographic_id,
        req.body
    );
    return res.status(200).json({
        success: true,
        message: "Demographic information updated successfully",
        data: demographic_info,
    });
};

exports.delete_demographic_info_by_user_id = async (req, res) => {
    const { user } = res.locals;
    try {
        const data = await Demographic.findOneAndDelete({ user_id: user._id });
        res.status(200).json({
            success: true,
            message: "Info deleted successfully",
            data: data,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error while deleting Demographic information by userid",
            error: error,
        });
    }
};
