const Joi = require("joi");
const Energy = require("../Models/energy");
const AppError = require("../AppError");

module.exports.get_energy_information = async (req, res) => {
    const { user } = res.locals;
    const { type } = req.query;

    const getDataByType = () => {
        switch (type) {
            case "electricity":
                return {
                    yearly_petrol_consumption: 0,
                    yearly_expenditure_petrol: 0,
                    purpose_petrol_used_for: 0,
                    source_of_fuels_used: 0,
                    energy_sufficient: 0,
                    extent: 0,
                };
            case "other":
                return {
                    electric_grid: 0,
                    yearly_electricity_consumption: 0,
                    yearly_expenditure_electricity: 0,
                    electricity_stable: 0,
                    microgrid_installed: 0,
                    micorgrid_type: 0,
                    usage: 0,
                    installation_cost: 0,
                    yearly_petrol_consumption: 0,
                    yearly_expenditure_petrol: 0,
                    purpose_petrol_used_for: 0,
                    energy_sufficient: 0,
                    extent: 0,
                };
            case "general_info":
                return {
                    electric_grid: 0,
                    yearly_electricity_consumption: 0,
                    yearly_expenditure_electricity: 0,
                    electricity_stable: 0,
                    microgrid_installed: 0,
                    micorgrid_type: 0,
                    usage: 0,
                    installation_cost: 0,
                    yearly_petrol_consumption: 0,
                    yearly_expenditure_petrol: 0,
                    purpose_petrol_used_for: 0,
                    source_of_fuels_used: 0,
                };
            default:
                return {
                    electric_grid: 0,
                    yearly_electricity_consumption: 0,
                    yearly_expenditure_electricity: 0,
                    electricity_stable: 0,
                    microgrid_installed: 0,
                    micorgrid_type: 0,
                    usage: 0,
                    installation_cost: 0,
                    source_of_fuels_used: 0,
                    energy_sufficient: 0,
                    extent: 0,
                };
        }
    };

    if (type) {
        const data = await Energy.findOne(
            {
                type,
                user_id: user._id,
            },
            getDataByType()
        );
        return res.json(data);
    }

    throw new AppError(0, "Please provide type of energy", 400);
};

module.exports.add_electricity_information = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            electric_grid: Joi.boolean().required(),
            yearly_electricity_consumption: Joi.number().required(),
            yearly_expenditure_electricity: Joi.number().required(),
            electricity_stable: Joi.boolean().required(),
            microgrid_installed: Joi.boolean().required(),
            microgrid_type: Joi.string().required(),
            usage: Joi.number().required(),
            installation_cost: Joi.number().required(),
        }).options({ stripUnknown: true });

        const { value, error } = schema.validate(req.body);
        if (error) throw error;

        const response = await Energy.create({
            type: "electricity",
            user_id: user._id,
            ...value,
        });

        return res.json(response);
    }

    const response = await Energy.create({
        user_id: user._id,
        type: "electricity",
        ...req.body,
    });

    return res.json(response);
};

module.exports.add_petrol_diesel_information = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            type: Joi.string()
                .required()
                .equal("petrol", "diesel", "natural_gas", "other"),
            yearly_petrol_consumption: Joi.number().required(),
            yearly_expenditure_petrol: Joi.number().required(),
            purpose_petrol_used_for: Joi.array()
                .items(
                    Joi.object({
                        type: Joi.string().required(),
                        quantity: Joi.number().required(),
                    }).required()
                )
                .required()
                .min(1),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const response = await Energy.create({ user_id: user._id, ...value });

        return res.json(response);
    }

    const response = await Energy.create({ user_id: user._id, ...req.body });

    return res.json(response);
};

module.exports.add_other_information = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            source_of_fuels_used: Joi.array()
                .items(
                    Joi.object({
                        type: Joi.string().required(),
                        purpose: Joi.array()
                            .items(Joi.string().required())
                            .required(),
                        expenditures: Joi.number().required(),
                        quantity: Joi.number().required(),
                        quantity_unit: Joi.string().required(),
                    }).required()
                )
                .required()
                .min(1),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const response = await Energy.create({
            user_id: user._id,
            type: "other",
            ...value,
        });

        return res.json(response);
    }

    const response = await Energy.create({
        user_id: user._id,
        type: "other",
        ...req.body,
    });

    return res.json(response);
};

module.exports.add_general_information = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            energy_sufficient: Joi.boolean().required(),
            extent: Joi.when("energy_sufficient", {
                is: true,
                then: Joi.string().required(),
                otherwise: Joi.string().optional(),
            }),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        let response = await Energy.create({
            user_id: user._id,
            type: "general_info",
            ...value,
        });

        return res.json(response);
    }

    const response = await Energy.create({
        user_id: user._id,
        type: "general_info",
        ...req.body,
    });

    return res.json(response);
};

module.exports.edit_electricity_information = async (req, res) => {
    if (req.body.status) {
        const schema = Joi.object({
            energy_id: Joi.string().required(),
            electric_grid: Joi.boolean().required(),
            yearly_electricity_consumption: Joi.number().required(),
            yearly_expenditure_electricity: Joi.number().required(),
            electricity_stable: Joi.boolean().required(),
            microgrid_installed: Joi.boolean().required(),
            microgrid_type: Joi.string().required(),
            usage: Joi.number().required(),
            installation_cost: Joi.number().required(),
        }).options({ stripUnknown: true });

        const { value, error } = schema.validate(req.body);
        if (error) throw error;

        const response = await Energy.findByIdAndUpdate(
            value.energy_id,
            value,
            { new: true, runValidators: true }
        );

        return res.json(response);
    }

    const response = await Energy.findByIdAndUpdate(
        req.body.energy_id,
        req.body,
        { new: true, runValidators: true }
    );

    return res.json(response);
};

module.exports.edit_petrol_diesel_information = async (req, res) => {
    if (req.body.status) {
        const schema = Joi.object({
            energy_id: Joi.string().required(),
            type: Joi.string()
                .required()
                .equal("petrol", "diesel", "natural_gas", "other"),
            yearly_petrol_consumption: Joi.number().required(),
            yearly_expenditure_petrol: Joi.number().required(),
            purpose_petrol_used_for: Joi.array()
                .items(
                    Joi.object({
                        type: Joi.string().required(),
                        quantity: Joi.number().required(),
                    }).required()
                )
                .required()
                .min(1),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const response = await Energy.findByIdAndUpdate(
            value.energy_id,
            value,
            { new: true, runValidators: true }
        );

        return res.json(response);
    }

    const response = await Energy.findByIdAndUpdate(
        req.body.energy_id,
        req.body,
        { new: true, runValidators: true }
    );

    return res.json(response);
};

module.exports.edit_other_information = async (req, res) => {
    if (req.body.status) {
        const schema = Joi.object({
            energy_id: Joi.string().required(),
            source_of_fuels_used: Joi.array()
                .items(
                    Joi.object({
                        type: Joi.string().required(),
                        purpose: Joi.array()
                            .items(Joi.string().required())
                            .required(),
                        expenditures: Joi.number().required(),
                        quantity: Joi.number().required(),
                        quantity_unit: Joi.string().required(),
                    }).required()
                )
                .min(1),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const response = await Energy.findByIdAndUpdate(
            value.energy_id,
            value,
            { new: true, runValidators: true }
        );

        return res.json(response);
    }

    const response = await Energy.findByIdAndUpdate(
        req.body.energy_id,
        req.body,
        { new: true, runValidators: true }
    );

    return res.json(response);
};

module.exports.edit_general_information = async (req, res) => {
    if (req.body.status) {
        const schema = Joi.object({
            energy_id: Joi.string().required(),
            energy_sufficient: Joi.boolean().required(),
            extent: Joi.when("energy_sufficient", {
                is: true,
                then: Joi.string().required(),
                otherwise: Joi.string().optional(),
            }),
        }).options({ stripUnknown: true });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const response = await Energy.findByIdAndUpdate(
            value.energy_id,
            value,
            { new: true, runValidators: true }
        );

        return res.json(response);
    }

    const response = await Energy.findByIdAndUpdate(
        req.body.energy_id,
        req.body,
        { new: true, runValidators: true }
    );

    return res.json(response);
};
