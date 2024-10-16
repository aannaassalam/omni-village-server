const mongoose = require("mongoose");

const fisherySchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: [true, "User id is required!"],
        },
        fishery_type: {
            type: mongoose.Schema.Types.String,
            required: [true, "Fishery type is required!"],
            enum: ["pond", "river"],
        },
        crop_id: {
            type: mongoose.Schema.Types.ObjectId,
            default: "",
            ref: "crop",
            required: [true, "Fish Crop is required!"],
        },
        number_of_fishes: {
            type: mongoose.Schema.Types.Number,
            required: [
                function () {
                    return this.status === 1;
                },
                "Number of fishes is required!",
            ],
            default: "",
        },
        type_of_feed: {
            type: mongoose.Schema.Types.String,
            required: [
                function () {
                    return this.status === 1 && this.fishery_type === "pond";
                },
                "Type of feed is required!",
            ],
            default: "",
        },
        total_feed: {
            type: mongoose.Schema.Types.Number,
            required: [
                function () {
                    return this.status === 1 && this.fishery_type === "pond";
                },
                "Total Feed is required!",
            ],
            default: "",
        },
        production_output: {
            type: mongoose.Schema.Types.Number,
            required: [
                function () {
                    return this.status === 1;
                },
                "Production output is required!",
            ],
            default: "",
        },
        self_consumed: {
            type: mongoose.Schema.Types.Number,
            required: [
                function () {
                    return this.status === 1;
                },
                "Self consumed is required!",
            ],
            default: "",
        },
        sold_to_neighbours: {
            type: mongoose.Schema.Types.Number,
            required: [
                function () {
                    return this.status === 1;
                },
                "Sold to neighbours is required!",
            ],
            default: "",
        },
        sold_for_industrial_use: {
            type: mongoose.Schema.Types.Number,
            required: [
                function () {
                    return this.status === 1;
                },
                "Sold for industrial use is required!",
            ],
            default: "",
        },
        wastage: {
            type: mongoose.Schema.Types.Number,
            required: [
                function () {
                    return this.status === 1;
                },
                "Wastage is required!",
            ],
            default: "",
        },
        other: {
            type: mongoose.Schema.Types.String,
            default: "",
        },
        other_value: {
            type: mongoose.Schema.Types.Number,
            default: "",
        },
        income_from_sale: {
            type: mongoose.Schema.Types.Number,
            required: [
                function () {
                    return this.status === 1;
                },
                "Income from sale is required!",
            ],
            default: "",
        },
        expenditure_on_inputs: {
            type: mongoose.Schema.Types.Number,
            required: [
                function () {
                    return this.status === 1;
                },
                "Expenditure on inputs is required!",
            ],
            default: "",
        },
        yeild: {
            type: mongoose.Schema.Types.Number,
            required: [
                function () {
                    return this.status === 1;
                },
                "Yeild is required!",
            ],
            default: "",
        },
        processing_method: {
            type: mongoose.Schema.Types.Boolean,
            required: [
                function () {
                    return this.status === 1;
                },
                "Processing method is required!",
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

module.exports = mongoose.model("fishery", fisherySchema);
