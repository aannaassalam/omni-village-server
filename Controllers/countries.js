const Joi = require("joi");
const Countries = require("../Models/countries");
const Villages = require("../Models/villages");
const Questions = require("../Models/questions");
const Responses = require("../Models/responses");
const AppError = require("../AppError");

module.exports.get_countries = async (req, res) => {
    const { active } = req.query;
    const query = active === "true" ? { active: true } : {};
    const countries = await Countries.find(query)
        .sort({ order: 1, name: 1 })
        .lean();
    return res.json(countries);
};

module.exports.add_country = async (req, res) => {
    const schema = Joi.object({
        name: Joi.string().required(),
        display_name: Joi.string().allow("").optional(),
        iso2: Joi.string().allow("").optional(),
        phone_code: Joi.string().allow("").optional(),
        currency: Joi.string().allow("").optional(),
        languages: Joi.array().items(Joi.string()).optional(),
        active: Joi.boolean().optional(),
        order: Joi.number().optional(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const country = await Countries.create({
        ...value,
        display_name: value.display_name || value.name,
        phone_code: String(value.phone_code || "").replace(/\D/g, ""),
        // English is always kept: it is the stored fallback for every label.
        languages: [...new Set(["en", ...(value.languages || [])])],
    });

    return res.json(country);
};

module.exports.edit_country = async (req, res) => {
    const schema = Joi.object({
        country_id: Joi.string().required(),
        name: Joi.string().optional(),
        display_name: Joi.string().allow("").optional(),
        iso2: Joi.string().allow("").optional(),
        phone_code: Joi.string().allow("").optional(),
        currency: Joi.string().allow("").optional(),
        languages: Joi.array().items(Joi.string()).optional(),
        active: Joi.boolean().optional(),
        order: Joi.number().optional(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const { country_id, ...patch } = value;
    if (patch.phone_code !== undefined) {
        patch.phone_code = String(patch.phone_code).replace(/\D/g, "");
    }
    if (patch.languages !== undefined) {
        patch.languages = [...new Set(["en", ...patch.languages])];
    }

    const country = await Countries.findByIdAndUpdate(country_id, patch, {
        new: true,
        runValidators: true,
    }).lean();
    if (!country) throw new AppError(0, "Country not found", 404);

    return res.json(country);
};

module.exports.delete_country = async (req, res) => {
    const { id } = req.query;
    if (!id) throw new AppError(0, "Please provide id", 400);

    // Deleting a country would orphan village links, orphan the countryId
    // denormalised onto every response submitted from it, and silently widen
    // the reach of every question that excludes it. Deactivating is the safe verb.
    const [villageCount, questionCount, responseCount] = await Promise.all([
        Villages.countDocuments({ countryId: id }),
        Questions.countDocuments({ "targeting.excludedCountries": id }),
        Responses.countDocuments({ countryId: id }),
    ]);

    if (villageCount > 0 || questionCount > 0 || responseCount > 0) {
        throw new AppError(
            0,
            `Country is in use by ${villageCount} village(s), ${questionCount} question(s) and ${responseCount} response(s) — deactivate it instead.`,
            409
        );
    }

    const country = await Countries.findByIdAndDelete(id);
    if (!country) throw new AppError(0, "Country not found", 404);

    return res.json({ message: "Country deleted successfully" });
};
