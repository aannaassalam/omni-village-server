/**
 * Declarative map from the existing hardcoded collections to the dynamic
 * questionnaire tree.
 *
 * Structure is DERIVED from the Mongoose schemas at run time (see
 * seed-questionnaire.js) — this file only carries the decisions a schema
 * cannot express: where a section sits in the tree, which dropdown `type`
 * backs a given field, and how the `type`-discriminator collections split
 * into separate screens.
 */

/* Never become questions: identity, bookkeeping, and the draft/approval flag. */
const SKIP_FIELDS = new Set([
    "_id",
    "__v",
    "user_id",
    "moderator_id",
    "village_id",
    "createdAt",
    "updatedAt",
    "status",
]);

/**
 * Screen splits for the collections that use a `type` discriminator to pack
 * several distinct forms into one collection.
 *
 * `excludes` is lifted verbatim from the projections in the existing
 * controllers — that is where this mapping already lives today.
 */
const SCREEN_SPLITS = {
    water: [
        {
            title: "Water usage",
            discriminator: [
                "cooking_and_drinking",
                "sanitation_and_bathing",
                "cleaning",
                "irrigation",
                "others",
            ],
            excludes: [
                "type_of_harvesting",
                "other_harvesting",
                "wastewater_disposal_methods",
                "water_recycle",
                "water_recycling_methods",
                "other_recycling",
                "water_meter",
                "water_scarcity",
                "water_scarcity_severity",
                "months_of_year_of_scarcity",
            ],
        },
        {
            title: "Water harvesting capacity",
            discriminator: ["water_harvesting_capacity"],
            excludes: [
                "yearly_consumption",
                "water_sourced_from",
                "water_quality",
                "expense",
                "other_name",
                "wastewater_disposal_methods",
                "water_recycle",
                "water_recycling_methods",
                "other_recycling",
                "water_meter",
                "water_scarcity",
                "water_scarcity_severity",
                "months_of_year_of_scarcity",
            ],
        },
        {
            title: "Wastewater disposal",
            discriminator: ["waste_water_disposal"],
            excludes: [
                "yearly_consumption",
                "water_sourced_from",
                "water_quality",
                "expense",
                "other_name",
                "type_of_harvesting",
                "other_harvesting",
                "water_meter",
                "water_scarcity",
                "water_scarcity_severity",
                "months_of_year_of_scarcity",
            ],
        },
        {
            title: "General water information",
            discriminator: ["general_information"],
            excludes: [
                "yearly_consumption",
                "water_sourced_from",
                "water_quality",
                "expense",
                "other_name",
                "type_of_harvesting",
                "other_harvesting",
                "wastewater_disposal_methods",
                "water_recycle",
                "water_recycling_methods",
                "other_recycling",
            ],
        },
    ],
};

/**
 * field -> dropdown `type`, only where the field name does not fuzzy-match the
 * type well enough to trust. The seeder prints every mapping it makes so the
 * auto-matched ones can be eyeballed.
 */
const DROPDOWN_TYPE_OVERRIDES = {
    demographicInfo: {
        language_speak: "language",
        language_read: "language",
        language_write: "language",
        chronic_disease: "chronic_diseases",
        motor_disablity: "motor_disability",
        currently_feeling: "overall_wellbeing",
        feelings_with_others: "communication_of_feelings",
        share_feelings_of_others: "empathy",
        support_you_have: "support_system",
        recover_from_stress: "stress_and_resilience",
        specific_habit: "habbits",
        education_status: "current_education_status",
        health_well_being: "health_and_wellbeing_aspirations",
    },
    water: {
        water_sourced_from: "sourced_from",
        wastewater_disposal_methods: "wastewater",
        water_recycling_methods: "wastewater",
        water_scarcity_severity: "water_quality",
        "type_of_harvesting.type": "type_of_harvesting",
    },
    mobility: {
        type: "type_of_vehicles",
        methods_of_mobility: "methods_of_mobility",
    },
    landholding: {
        "purpose_land_utilised_for.type": "purpose",
        "purpose_land_utilised_for.type_category": "purpose",
        "purpose_status_of_land.type": "status",
        "purpose_status_of_land.type_category": "status",
    },
    energy: {
        "purpose_petrol_used_for.type": "purpose_petrol",
        "source_of_fuels_used.type": "source_of_fuels_used",
        "source_of_fuels_used.purpose": "purpose_petrol",
    },
    forestry: {
        "other_produced_harvested_from_forest.type": "other_produce_from_forest",
        "other_produced_harvested_from_forest.purpose": "general_purpose",
        "forestry_type.type": "timber_needs_purpose",
        "forestry_type.purpose": "timber_needs_purpose",
        "forestry_type.urgency": "timber_needs_urgency",
    },
    "business-commercial": {
        "raw_material_consumption.item": "raw_materials",
        "fuel_source.item": "fuel_sources",
    },
    "other-personal-household-items": {
        "items_produces.type": "personal_care",
    },
};

/**
 * field -> answer type, where the schema cannot say it. Housing keeps the
 * PATH of each uploaded picture in a String, which would otherwise be seeded
 * as a text box to type into.
 *
 * Only a fresh database gets these. One that already has the five as `text`
 * is changed in the editor: the answer type while nobody has answered,
 * "Create a replacement question" after that.
 */
const TYPE_OVERRIDES = {
    housing: {
        front_photo: "photo",
        back_photo: "photo",
        neighbourhood_photo: "photo",
        inside_living_photo: "photo",
        kitchen_photo: "photo",
    },
};

/** Labels that humanising the field name gets wrong or ugly. */
const LABEL_OVERRIDES = {
    avg_age_of_live_stocks: "Average age of livestock",
    avg_age_time_period: "Average age is measured in",
    motor_disablity: "Motor disability",
    specific_habit: "Habits",
    other_motor: "Other motor disability",
    other_chronic: "Other chronic disease",
    no_of_floors: "Number of floors",
    number_of_members: "Number of household members",
    total_land_area_utilised: "Total land area utilised",
    geotag: "Geotag",
    expenditure_on_inputs: "Expenditure on inputs",
    income_from_sale: "Income from sale",
    self_consumed: "Self consumed",
    sold_to_neighbours: "Sold to neighbours",
    sold_for_industrial_use: "Sold for industrial use",
    month_harvested: "Month harvested",
    processing_method: "Is it processed?",
    water_recycle: "Is water recycled?",
    water_meter: "Is there a water meter?",
    water_scarcity: "Is there water scarcity?",
    bank_account: "Has a bank account",
    land_under_use: "Is the land currently in use?",
};

/**
 * The household census. `model` names a Mongoose model in ../Models; every
 * field on it becomes a question unless skipped above.
 *
 * Production and Consumption are NOT here: they are written out in
 * app-screens.js to mirror the mobile app's screens, which a schema cannot
 * describe (many crops per person, pond vs river, a list per consumption type).
 *
 * Officer collections are deliberately absent: a response is keyed to a
 * userId, whereas officer data is per moderator + village. Modelling that
 * needs a second owner type on `responses`, which this phase does not add.
 */
const TREE = [
    {
        title: "Household census",
        children: [
            { title: "Demographics", model: "demographicInfo" },
            { title: "Landholding", model: "landholding" },
            { title: "Housing", model: "housing" },
            { title: "Water", model: "water", split: "water" },
            { title: "Energy", model: "energy" },
            { title: "Mobility", model: "mobility" },
            { title: "Forestry", model: "forestry" },
            { title: "Business & commercial", model: "business-commercial" },
            {
                title: "Personal & household items",
                model: "other-personal-household-items",
            },
        ],
    },
];

/** Which dropdown collection backs each section. */
const DROPDOWN_MODELS = {
    demographicInfo: "demographic-dropdown",
    landholding: "landholding-dropdown",
    housing: "housing-dropdown",
    water: "water-dropdown",
    energy: "energy-dropdown",
    mobility: "mobility-dropdown",
    forestry: "forestry-dropdown",
    "business-commercial": "business-dropdown",
    "other-personal-household-items":
        "other-personal-household-items-dropdown",
};

module.exports = {
    SKIP_FIELDS,
    SCREEN_SPLITS,
    DROPDOWN_TYPE_OVERRIDES,
    TYPE_OVERRIDES,
    LABEL_OVERRIDES,
    TREE,
    DROPDOWN_MODELS,
};
