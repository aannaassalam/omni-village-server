const mongoose = require("mongoose");

const consumptionSchema = new mongoose.Schema(
    {
        crop_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        weight_measurement: {
            type: mongoose.Schema.Types.String,
            required: [
                function () {
                    return this.status === 1;
                },
                "Weight measurement is required!",
            ],
            default: "",
        },
        consumption_type_id: {
            type: mongoose.Schema.ObjectId,
            default: "",
            required: [true, "Consumption Type Id is required!"],
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "User id is required!"],
            ref: "User",
        },
        total_quantity: {
            type: mongoose.Schema.Types.Number,
            required: [
                function () {
                    return this.status === 1;
                },
                "Number of live stocks is required!",
            ],
            default: "",
        },
        purchased_from_market: {
            type: mongoose.Schema.Types.Number,
            required: [
                function () {
                    return this.status === 1;
                },
                "Purchase from market is required",
            ],
            default: "",
        },
        purchased_from_neighbours: {
            type: mongoose.Schema.Types.Number,
            required: [
                function () {
                    return this.status === 1;
                },
                "Purchase from neighbours is required",
            ],
            default: "",
        },
        self_grown: {
            type: mongoose.Schema.Types.Number,
            required: [
                function () {
                    return this.status === 1;
                },
                "Self grown is required is required",
            ],
            default: "",
        },
        status: {
            type: mongoose.Schema.Types.Number,
            default: 1,
            enum: [0, 1],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("consumption", consumptionSchema);
