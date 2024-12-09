const Villages = require("../Models/villages");
const MobilityOfficer = require("../Models/mobility-officer");
const DemographicOfficer = require("../Models/demographic-officer");
const EnergyOfficer = require("../Models/energy-officer");
const LandholdingOfficer = require("../Models/landholding-officer");
const WaterOfficer = require("../Models/water-officer");
const AppError = require("../AppError");
const Joi = require("joi");

const handleErrors = (err) => {
    let errors = {};
    if (err.code === 11000) {
        errors.name = "Village already exists!";
        return errors;
    }
    return err;
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
            name,
        });
        res.json(village);
        // } else {
        //   res.status(401).json({ message: "Unauthorized!" });
        // }
    } catch (err) {
        res.status(400).json(handleErrors(err));
    }
};

module.exports.edit_village = async (req, res) => {
    const { country, name, village_id } = req.body;
    const { user } = res.locals;
    try {
        // if (user) {
        const updatedVillage = await Villages.findByIdAndUpdate(village_id, {
            country,
            name,
        });
        res.json(updatedVillage);
        // } else {
        //   res.status(401).json({ message: "Unauthorized!" });
        // }
    } catch (err) {
        res.status(400).json(handleErrors(err));
    }
};

module.exports.delete_village = async (req, res) => {
    const { village_id } = req.params;
    const { user } = res.locals;
    try {
        // if (user) {
        const deletedVillage = await Villages.findByIdAndDelete(village_id);
        res.json(deletedVillage);
        // } else {
        //   res.status(401).json({ message: "Unauthorized!" });
        // }
    } catch (err) {
        res.status(400).json(handleErrors(err));
    }
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
