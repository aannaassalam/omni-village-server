const mongoose = require("mongoose");

const forestryOfficerSchema = new mongoose.Schema(
    {
        moderator_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        village_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "village",
        },
        type_of_forest_accessible: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        area_of_forest_accessible: {
            type: Number,
            default: null,
        },
        do_you_have_flora_fauna: {
            type: Boolean,
            default: false,
        },
        link_of_the_doc: {
            type: String,
            default: "",
        },
        condition_of_forest_accessible: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        incident_of_forest_fire: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        incident_of_wildlife_conflict: {
            type: Boolean,
            default: false,
        },
        describe: {
            type: String,
            default: "",
        },
        any_incident_of_illegal_forest_activities: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("forestry_officer", forestryOfficerSchema);
