const mongoose = require("mongoose");

const mobilityOfficerSchema = new mongoose.Schema({
    moderator_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    village_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "village",
    },
    house_connected_to_internal_road: {
        type: String,
        default: null,
    },
    house_not_connected_to_internal_road: {
        type: String,
        default: null,
    },
    village_connected_to_highway: {
        type: Boolean,
        default: false,
    },
    mobility_requirement: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    reason: {
        type: String,
        default: null,
    },
    condition_of_internal_roads: {
        type: String,
        default: null,
    },
    safety_issues_on_roads: {
        type: Boolean,
        default: false,
    },
    describe: {
        type: String,
        default: null,
    },
    connectivity_to_healthcare_facilities: {
        type: String,
        default: null,
    },
    road_infrastructure_damaged: {
        type: Boolean,
        default: false,
    },
    road_damage_frequency: {
        type: String,
        default: null,
    },
});

module.exports = mongoose.model("mobility_officer", mobilityOfficerSchema);
