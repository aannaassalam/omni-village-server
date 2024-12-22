const mongoose = require("mongoose");

const communityOfficerDropdownSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: [
                "no_of_townhall",
                "no_of_market",
                "no_of_bank",
                "distance_of_bank",
                "no_of_healthcare",
                "distance_of_healthcare",
                "no_of_library",
                "no_of_museum",
                "kind_of_sports",
                "frequency_of_spiritual_retreats",
                "no_of_spiritual_sanctums",
                "no_of_post_office",
                "post_office_distance",
                "no_of_sewage_treatment_facility",
                "types_of_sewage_treatment_facility",
                "no_of_composting_facility",
                "types_of_composting_facility",
                "types_of_recycling_facility",
                "level_of_waste_segregation",
                "type_of_street_lights",
                "no_of_broadband_providers",
                "method_of_broadband",
                "bandwidth_of_broadband",
                "stability_of_broadband",
                "distance_of_burial_cremation",
                "distance_of_animal_shelters",
                "type_of_animal_shelters",
                "capacity_of_parking",
                "type_of_children_playground",
                "type_of_senile_center",
                "type_of_mobility",
                "capacity_of_water_storage",
                "type_of_cold_storage",
                "capacity_of_cold_storage",
                "type_of_energy_and_battery_house",
                "capacity_of_energy_and_battery_house",
            ],
            required: true,
        },
        name: {
            en: {
                type: mongoose.Schema.Types.String,
                required: [
                    true,
                    "Please Enter a Community officer dropdown name!",
                ],
                set: (value) => value.toLowerCase(),
            },

            ms: {
                type: mongoose.Schema.Types.String,
                default: "",
                // unique: true,
                set: (value) => value.toLowerCase(),
            },

            dz: {
                type: mongoose.Schema.Types.String,
                default: "",
                // unique: true,
                set: (value) => value.toLowerCase(),
            },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model(
    "community_officer_dropdown",
    communityOfficerDropdownSchema
);
