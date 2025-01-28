const Joi = require("joi");
const BusinessCommercial = require("../Models/business-commercial");
const AppError = require("../AppError");

module.exports.get_business_by_user = async (req, res) => {
    const { user } = res.locals;
    const business_by_user = await BusinessCommercial.find({
        user_id: user._id,
    });
    return res.json(business_by_user);
};

module.exports.get_business = async (req, res) => {
    const { business_id } = req.query;
    if (business_id) {
        const business = await BusinessCommercial.findById(business_id);
        return res.json(business);
    }
    throw new AppError(0, "Please provide business_id", 400);
};

module.exports.add_business = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            business_name: Joi.string().required(),
            business_type: Joi.string().required(),
            other_type: Joi.string().optional().allow(""),
            year_started: Joi.number().required(),
            brief_description: Joi.string().required(),
            segment_served: Joi.string().required(),
            location: Joi.string().required(),
            land_area_utilised: Joi.number().required(),
            built_up_area: Joi.number().required(),
            total_employee: Joi.number().required(),
            coworker_inside_village: Joi.number().required(),
            coworker_outside_village: Joi.number().required(),
            legal_structure: Joi.string().required(),
            annual_turnover: Joi.number().required(),
            made_profit: Joi.boolean().required(),
            total_profit: Joi.number().optional().allow(null),
            total_loss: Joi.number().optional().allow(null),
            investment_need_so_far: Joi.number().required(),
            water_consumption: Joi.number().required(),
            energy_consumption: Joi.number().required(),
            raw_material_consumption: Joi.array()
                .items(
                    Joi.object({
                        item: Joi.string().required(),
                        quantity: Joi.number().required(),
                        raw_consumption_unit: Joi.string().required(),
                    }).required()
                )
                .required()
                .min(1),
            fuel_source: Joi.array()
                .items(
                    Joi.object({
                        item: Joi.string().required(),
                        quantity: Joi.number().required(),
                        fuel_source_unit: Joi.string().required(),
                    }).required()
                )
                .required()
                .min(1),
            type_of_infrastructure: Joi.array()
                .items(Joi.string().required())
                .required()
                .min(1),
            machine_equipment_installed: Joi.string().required(),
            skill_requirement: Joi.boolean().required(),
            type_of_skill: Joi.string().optional().allow(""),
            skill_urgency: Joi.string().optional().allow(""),
            manpower_requirement: Joi.boolean().required(),
            number_of_manpower: Joi.number().optional().allow(""),
            manpower_urgency: Joi.string().optional().allow(""),
            equipment_requirement: Joi.boolean().required(),
            equipment_type: Joi.string().optional().allow(""),
            equipment_urgency: Joi.string().optional().allow(""),
            other: Joi.string().optional().allow(""),
            urgency: Joi.string().optional().allow(""),
            status: Joi.number().allow(0, 1).required(),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const business = await BusinessCommercial.create({
            user_id: user._id,
            ...value,
        });

        return res.json({
            message: "Business Commercial added successfully",
            ...business._doc,
        });
    }

    const business = await BusinessCommercial.create({
        user_id: user._id,
        ...req.body,
    });

    return res.json({
        message: "Business Commercial added successfully",
        ...business._doc,
    });
};

module.exports.update_business = async (req, res) => {
    if (req.body.status) {
        const schema = Joi.object({
            business_id: Joi.string().required(),
            business_name: Joi.string().required(),
            business_type: Joi.string().required(),
            other_type: Joi.string().optional().allow(""),
            year_started: Joi.number().required(),
            brief_description: Joi.string().required(),
            segment_served: Joi.string().required(),
            location: Joi.string().required(),
            land_area_utilised: Joi.number().required(),
            built_up_area: Joi.number().required(),
            total_employee: Joi.number().required(),
            coworker_inside_village: Joi.number().required(),
            coworker_outside_village: Joi.number().required(),
            legal_structure: Joi.string().required(),
            annual_turnover: Joi.number().required(),
            made_profit: Joi.boolean().required(),
            total_profit: Joi.number().optional().allow(null),
            total_loss: Joi.number().optional().allow(null),
            investment_need_so_far: Joi.number().required(),
            water_consumption: Joi.number().required(),
            energy_consumption: Joi.number().required(),
            raw_material_consumption: Joi.array()
                .items(
                    Joi.object({
                        item: Joi.string().required(),
                        quantity: Joi.number().required(),
                        raw_consumption_unit: Joi.string().required(),
                    }).required()
                )
                .required()
                .min(1),
            fuel_source: Joi.array()
                .items(
                    Joi.object({
                        item: Joi.string().required(),
                        quantity: Joi.number().required(),
                        fuel_source_unit: Joi.string().required(),
                    }).required()
                )
                .required()
                .min(1),
            type_of_infrastructure: Joi.array()
                .items(Joi.string().required())
                .required()
                .min(1),
            machine_equipment_installed: Joi.string().required(),
            skill_requirement: Joi.boolean().required(),
            type_of_skill: Joi.string().optional().allow(""),
            skill_urgency: Joi.string().optional().allow(""),
            manpower_requirement: Joi.boolean().required(),
            number_of_manpower: Joi.number().optional().allow(""),
            manpower_urgency: Joi.string().optional().allow(""),
            equipment_requirement: Joi.boolean().required(),
            equipment_type: Joi.string().optional().allow(""),
            equipment_urgency: Joi.string().optional().allow(""),
            other: Joi.string().optional().allow(""),
            urgency: Joi.string().optional().allow(""),
            status: Joi.number().allow(0, 1).required(),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const business = await BusinessCommercial.findByIdAndUpdate(
            value.business_id,
            value,
            {
                runValidators: true,
                new: true,
            }
        );

        return res.json({
            message: "Business Commercial updated successfully",
            ...business._doc,
        });
    }

    const business = await BusinessCommercial.findByIdAndUpdate(
        req.body.business_id,
        req.body,
        { runValidators: true, new: true }
    );

    return res.json({
        message: "Business Commercial updated successfully",
        ...business._doc,
    });
};

module.exports.delete_business = async (req, res) => {
    const { id } = req.query;
    await BusinessCommercial.findByIdAndDelete(id);
    return res.json({ message: "Business deleted successfully" });
};
