const Villages = require("../Models/villages");
const Countries = require("../Models/countries");
const MobilityOfficer = require("../Models/mobility-officer");
const DemographicOfficer = require("../Models/demographic-officer");
const EnergyOfficer = require("../Models/energy-officer");
const LandholdingOfficer = require("../Models/landholding-officer");
const WaterOfficer = require("../Models/water-officer");
const AppError = require("../AppError");
const Joi = require("joi");
const { edit_place } = require("./places");

const handleErrors = (err) => {
    let errors = {};
    if (err.code === 11000) {
        errors.name = "Village already exists!";
        return errors;
    }
    return err;
};

/**
 * The tree of places joins on `countryId`; the free-text `country` stays the
 * key for everything older. A village saved without the id would hang
 * outside the tree, so both writes below set it. null when no country has
 * that name yet — `countries.name` is lowercase, hence the lookup.
 */
const countryIdFor = async (country) => {
    const match = await Countries.findOne({
        name: String(country).toLowerCase(),
    })
        .select({ _id: 1 })
        .lean();
    return match?._id || null;
};

module.exports.get_villages = async (req, res) => {
    const { country_name } = req.params;
    const { user } = res.locals;
    try {
        const villages = await Villages.find({
            country: user?.country?.toLowerCase() || country_name.toLowerCase(),
        });
        res.json(villages);
    } catch (err) {
        res.status(400).json(handleErrors(err));
    }
};

module.exports.get_all_villages = async (req, res) => {
    try {
        const villages = await Villages.find({});
        res.json(villages);
    } catch (err) {
        res.status(400).json(handleErrors(err));
    }
};

module.exports.add_village = async (req, res) => {
    const { country, name } = req.body;
    const { user } = res.locals;
    try {
        // if (user) {
        const village = await Villages.create({
            country,
            // Trimmed: a villager is matched to a village by this name.
            name: typeof name === "string" ? name.trim() : name,
            countryId: await countryIdFor(country),
        });
        res.json(village);
        // } else {
        //   res.status(401).json({ message: "Unauthorized!" });
        // }
    } catch (err) {
        res.status(400).json(handleErrors(err));
    }
};

/**
 * Settings' village form. A village is a place now, so a rename goes through
 * the same handler Locations uses (Controllers/places.js edit_place) and
 * keeps its rules: no renaming a village that has villagers, no duplicate
 * names, the name stored in lower case. Another country is not a rename: a
 * place stays in its country, there as here.
 */
module.exports.edit_village = async (req, res) => {
    const { country, name, village_id } = req.body;
    if (typeof village_id !== "string" || !/^[a-f0-9]{24}$/i.test(village_id)) {
        throw new AppError(0, "Village not found", 404);
    }
    const village = await Villages.findById(village_id).lean();
    if (!village) throw new AppError(0, "Village not found", 404);

    if (
        typeof country === "string" &&
        country.trim().toLowerCase() !== String(village.country).toLowerCase()
    ) {
        throw new AppError(
            0,
            "A village cannot be moved to another country. Delete it and add it under the other country.",
            409
        );
    }

    req.params.id = village_id;
    req.body = typeof name === "string" ? { name } : {};
    return edit_place(req, res);
};

module.exports.add_moderator_to_village = async (req, res) => {
    const schema = Joi.object({
        moderator_id: Joi.string().required(),
        village_id: Joi.string().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const village = await Villages.findById(value.village_id);

    await Promise.all([
        Villages.findByIdAndUpdate(
            value.village_id,
            {
                $set: {
                    moderator_id: value.moderator_id,
                },
            },
            { runValidators: true }
        ),
        MobilityOfficer.findOneAndUpdate(
            {
                moderator_id: village.moderator_id,
                village_id: village._id,
            },
            {
                $set: {
                    moderator_id: value.moderator_id,
                },
            },
            { runValidators: true }
        ),
        LandholdingOfficer.findOneAndUpdate(
            {
                moderator_id: village.moderator_id,
                village_id: village._id,
            },
            {
                $set: {
                    moderator_id: value.moderator_id,
                },
            },
            { runValidators: true }
        ),
        EnergyOfficer.findOneAndUpdate(
            {
                moderator_id: village.moderator_id,
                village_id: village._id,
            },
            {
                $set: {
                    moderator_id: value.moderator_id,
                },
            },
            { runValidators: true }
        ),
        DemographicOfficer.findOneAndUpdate(
            {
                moderator_id: village.moderator_id,
                village_id: village._id,
            },
            {
                $set: {
                    moderator_id: value.moderator_id,
                },
            },
            { runValidators: true }
        ),
        WaterOfficer.findOneAndUpdate(
            {
                moderator_id: village.moderator_id,
                village_id: village._id,
            },
            {
                $set: {
                    moderator_id: value.moderator_id,
                },
            },
            { runValidators: true }
        ),
    ]);

    res.json({ message: "Moderator added to village successfully" });
};

module.exports.get_villages_for_moderator = async (req, res) => {
    const { user } = res.locals;
    const villages = await Villages.find({ moderator_id: user._id });
    return res.json(villages);
};
