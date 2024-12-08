const mongoose = require("mongoose");

const energyOfficerSchema = new mongoose.Schema({
    moderator_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    available_renewable_energy: [
        {
            type: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
            },
            energy_source: {
                type: Boolean,
                default: false,
            },
            capacity: {
                type: Number,
                default: 0,
            },
            distribution_method: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    default: null,
                },
            ],
            installation_cost: {
                type: Number,
                default: 0,
            },
            central_grid_fossil: {
                type: Number,
                default: 0,
            },
            central_grid_renewable: {
                type: Number,
                default: 0,
            },
            local_renewable_microgrid: {
                type: Number,
                default: 0,
            },
            access_to_pumps: {
                type: Boolean,
                default: true,
            },
        },
    ],
});

module.exports = mongoose.model("energy_officer", energyOfficerSchema);
