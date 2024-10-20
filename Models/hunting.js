const mongoose = require("mongoose");

const huntingSchema = new mongoose.Schema(
    {
        crop_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "Hunting Crop id is required!"],
            ref: "crop",
            default: "",
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "User id is required!"],
            ref: "user",
        },
        number_hunted: {
            type: mongoose.Schema.Types.Number,
            required: [
                function () {
                    return this.status === 1;
                },
                "Number hunted per year is required!",
            ],
            default: "",
        },
        meat: {
            type: mongoose.Schema.Types.Number,
            required: [
                function () {
                    return this.status === 1;
                },
                "Meat is required",
            ],
            default: "",
        },
        weight_measurement: {
            type: mongoose.Schema.Types.String,
            default: "kilogram",
        },
        self_consumed: {
            type: mongoose.Schema.Types.Number,
            required: [
                function () {
                    return this.status === 1;
                },
                "Self Comsumption is required!",
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
        sold_in_consumer_market: {
            type: mongoose.Schema.Types.Number,
            required: [
                function () {
                    return this.status === 1;
                },
                "Sold in consumer market is required!",
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
        others: {
            type: mongoose.Schema.Types.String,
            default: "",
        },
        others_value: {
            type: mongoose.Schema.Types.Number,
            default: 0,
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
                "Expenditure on inputs in required!",
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
        required_processing: {
            type: mongoose.Schema.Types.Boolean,
            reqired: [
                function () {
                    return this.status === 1;
                },
                "Processing method is it required?",
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

module.exports = mongoose.model("Hunting", huntingSchema);
