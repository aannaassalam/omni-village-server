const mongoose = require("mongoose");

const communityOfficerSchema = new mongoose.Schema({
    moderator_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    average_population_growth_rate: {
        type: String,
        default: null,
    },
    common_land_measurement_unit: {
        type: String,
        default: null,
    },
    how_much: {
        type: String,
        default: null,
    },
    local_language: {
        type: String,
        default: null,
    },
    common_traditional_house: {
        type: String,
        default: null,
    },
    upload_house_picture: [
        {
            type: String,
            default: null,
        },
    ],
});

module.exports = mongoose.model("community_officer", communityOfficerSchema);
