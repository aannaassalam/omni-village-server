const mongoose = require("mongoose");

const landholdingSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        // landholding_by_user_id: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     required: true,
        // },
        land_located: {
            type: String,
            default: null,
        },
        total_land_area: {
            type: Number,
            default: null,
        },
        year_purchased: {
            type: Number,
            default: null,
        },
        geotag: {
            type: String,
            default: null,
        },
        land_under_use: {
            type: Boolean,
            default: false,
        },
        total_purpose: [
            {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },
        ],
        purpose_land_utilised_for: [
            {
                type: {
                    type: mongoose.Schema.Types.ObjectId,
                    default: null,
                },
                type_category: [
                    {
                        type: mongoose.Schema.Types.ObjectId,
                        default: null,
                    },
                ],
                total_land_area_utilised: {
                    type: Number,
                    default: null,
                },
            },
        ],
        status_of_land: [
            {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },
        ],
        purpose_status_of_land: [
            {
                type: {
                    type: mongoose.Schema.Types.ObjectId,
                    default: null,
                },
                type_category: [
                    {
                        type: mongoose.Schema.Types.ObjectId,
                        default: null,
                    },
                ],
                total_land_area_utilised: {
                    type: Number,
                    default: null,
                },
            },
        ],
        status: {
            type: mongoose.Schema.Types.Number,
            default: 0,
            required: [
                true,
                "Status is required!(0 - from user & 1 - from admin or approved)",
            ],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("landholding", landholdingSchema);
