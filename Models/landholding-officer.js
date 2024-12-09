const mongoose = require("mongoose");

const landholdingOfficerSchema = new mongoose.Schema({
    moderator_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    village_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "village",
    },
    total_area_allocated_village: {
        type: Number,
        default: 0,
    },
    area_unit: {
        type: String,
        default: null,
    },
    farming_community_infrastructure: {
        type: Number,
        default: 0,
    },
    unutilized_area: {
        type: Number,
        default: 0,
    },
    fallow: {
        type: Number,
        default: 0,
    },
    under_forest: {
        type: Number,
        default: 0,
    },
    under_grassland: {
        type: Number,
        default: 0,
    },
    others: {
        type: Number,
        default: 0,
    },
    land_owned_by_non_resident: {
        type: Number,
        default: 0,
    },
    total_area_privately_owned: {
        type: Number,
        default: 0,
    },
});

module.exports = mongoose.model(
    "landholding_officer",
    landholdingOfficerSchema
);
