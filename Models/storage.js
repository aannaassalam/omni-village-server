const mongoose = require("mongoose");

const storageSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "User id is required!"],
            ref: "User",
        },
        // storage_id: {
        //     type: mongoose.Schema.Types.Number,
        //     required: [true, "Storage Id is required!"],
        // },
        storage_name: {
            type: mongoose.Schema.Types.String,
            required: [true, "Storage name is required!"],
        },
        storage_method_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "storage_method",
            required: [true, "Storage method id is required!"],
        },
        storage_method_name: {
            type: mongoose.Schema.Types.String,
            default: "",
            // required: [true, "Storage method name is required!"],
        },
        storage_quantity: {
            type: mongoose.Schema.Types.Decimal128,
            required: [
                function () {
                    return this.storage_method_id?.length > 0;
                },
                "Storage quantity is required!",
            ],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("storage", storageSchema);
