const fs = require("fs");
const path = require("path");
const { normaliseLocalised } = require("../utils/localised");
const { DEFAULT_BUNDLE_DIR } = require("./app-translations");

/**
 * Production and Consumption, written out to MIRROR THE MOBILE APP'S SCREENS.
 *
 * These two are not derived from the Mongoose schemas the way the household
 * census is, because a schema cannot say what the app does:
 *
 *   - a person records MANY crops / trees / livestock / fish / items, so each
 *     screen is a repeatable group, not one flat form;
 *   - "Total land" lives on the user document, not in a survey collection;
 *   - Fishery is two flows (pond, river); Consumption is one list per type;
 *   - Storage is four fixed stocks; Selling channel is a fixed multi-select;
 *   - feed, weight unit and age range are pickers, though stored as strings.
 *
 * Order, wording and Malay come from the app: every `t("key")` below is an
 * i18next key the matching screen already uses.
 */

const bundle = (language) => {
    try {
        return JSON.parse(
            fs.readFileSync(
                path.join(DEFAULT_BUNDLE_DIR, `${language}.json`),
                "utf8"
            )
        );
    } catch (err) {
        return {};
    }
};
const EN = bundle("en");
const MS = bundle("ms");

/** Localised label from an app i18next key; `english` fixes the app's typos. */
const t = (key, english) => {
    const en = english || EN[key] || key;
    const label = { en: en.charAt(0).toUpperCase() + en.slice(1) };
    const ms = MS[key];
    if (ms && ms.trim() && ms.trim().toLowerCase() !== en.toLowerCase()) {
        label.ms = ms.trim().charAt(0).toUpperCase() + ms.trim().slice(1);
    }
    return label;
};

const OTHERS = { value: "others", label: { en: "Others", ms: "Lain-lain" } };

const text = (label, extra = {}) => ({ type: "text", label, ...extra });
const number = (label, extra = {}) => ({ type: "number", label, min: 0, ...extra });
const date = (label, extra = {}) => ({ type: "date", label, ...extra });
const yesNo = (label, extra = {}) => ({ type: "boolean", label, ...extra });
const one = (label, options, extra = {}) => ({
    type: "single_select",
    label,
    options,
    ...extra,
});
const many = (label, options, extra = {}) => ({
    type: "multi_select",
    label,
    options,
    ...extra,
});
const section = (label, children) => ({ type: "section", label, children });
const group = (label, children, extra = {}) => ({
    type: "repeatable_group",
    label,
    // Each entry opens on its own screen, as each crop does in the app.
    presentation: "screen",
    children,
    ...extra,
});

/** Options whose stored value is the word itself (the old schemas' enums). */
const words = (...keys) =>
    keys.map((key) => ({ value: key, label: t(key) }));

const buildAppTree = async (db, warn = () => {}) => {
    /** Options from a master collection; the document `_id` is the value. */
    const from = async (collection, filter = {}) => {
        const docs = await db.collection(collection).find(filter).toArray();
        const options = docs
            // status 0 is a name a villager typed in, awaiting approval.
            .filter((doc) => doc.status === undefined || doc.status === 1)
            .map((doc) => ({
                value: String(doc._id),
                label: normaliseLocalised(doc.name),
            }))
            .filter((option) => option.label)
            .sort((a, b) => a.label.en.localeCompare(b.label.en));
        if (options.length === 0) {
            warn(`"${collection}" has no usable rows — its picker will be empty`);
        }
        return options;
    };
    /** Options stored by NAME, as the old schemas store units and feed. */
    const byName = async (collection, filter = {}) =>
        (await from(collection, filter)).map((option) => ({
            value: option.label.en.toLowerCase(),
            label: option.label,
        }));

    const weightUnits = await byName("weight_measurements");
    const landUnits = await byName("land_measurements");
    const feeds = await byName("feeds");
    const fishFeeds = await byName("fish_feeds");

    const weight = () => one(t("weight measurement"), weightUnits);

    /** "What is it?" — a master list, or Others and a name typed in. */
    const what = (label, options, nameLabel) => [
        one(label, [...options, OTHERS], { required: true }),
        text(nameLabel, {
            helper_text: {
                en: "Only if you chose Others",
                ms: "Hanya jika anda memilih Lain-lain",
            },
        }),
    ];

    const soil = () => [
        one(t("soil health"), words("stable", "decreasing yield")),
        number(t("how much from first planting", "Decrease from first planting")),
        one(
            t("type of fertilizer"),
            words("organic self made", "organic purchased", "chemical based", "none")
        ),
        one(
            t("type of pesticides"),
            words("organic self made", "organic purchased", "chemical based", "none")
        ),
    ];
    const money = () => [
        number(t("income from sale")),
        number(t("expenditure on input")),
    ];
    const other = () => [
        text(t("Other(Specify if any)", "Other (specify if any)")),
        number({ en: "Other quantity", ms: "Kuantiti lain" }),
    ];

    /** The "harvested product" sub-screen shared by trees and livestock. */
    const products = (withLivestock) =>
        group(t("harvested product"), [
            text(t("name of harvested product"), { required: true }),
            number(t("output"), { required: true }),
            number(t("self consumed")),
            ...(withLivestock ? [number(t("fed to livestock"))] : []),
            number(t("sold to neighbour")),
            number(t("sold for industrial use")),
            number(t("wastage")),
            ...other(),
            date(t("month harvested")),
            yesNo(t("required processing")),
        ]);

    const fish = async (withFeedTotal) =>
        group({ en: "Fish", ms: "Ikan" }, [
            ...what(
                { en: "Fish", ms: "Ikan" },
                await from("fishery_crops"),
                t("fish name")
            ),
            section(t("important information"), [
                number(t("number"), { required: true }),
                weight(),
                one(t("type of feed"), [...fishFeeds, OTHERS]),
                text(t("create type", "Other type of feed")),
            ]),
            section(t("production information"), [
                ...(withFeedTotal ? [number(t("total feed"))] : []),
                number(t("output"), { required: true }),
                number(t("self consumed")),
                number(t("sold to neighbour")),
                number(t("sold for industrial use")),
                number(t("wastage")),
                ...other(),
                ...money(),
                number(t("yields", "Yield")),
            ]),
            yesNo(t("required processing")),
        ]);

    /* ---------------------------- Production ---------------------------- */

    const production = {
        title: t("production"),
        children: [
            {
                title: t("total land", "Total land"),
                questions: [
                    one(t("land measurement"), landUnits, { required: true }),
                    number(t("total land area"), { required: true }),
                    section(t("sub area"), [
                        number(t("cultivation"), { required: true }),
                        number(t("trees"), { required: true }),
                        number(t("poultry"), { required: true }),
                        number(t("fishery"), { required: true }),
                        number(t("storage"), { required: true }),
                    ]),
                ],
                description: {
                    en: "The sub areas together cannot be more than the total land area.",
                    ms: "Jumlah sub kawasan tidak boleh melebihi jumlah keluasan tanah.",
                },
            },
            {
                title: t("cultivation"),
                questions: [
                    group({ en: "Crop", ms: "Tanaman" }, [
                        ...what(
                            { en: "Crop", ms: "Tanaman" },
                            await from("crops"),
                            t("crop name")
                        ),
                        number(t("area allocated"), { required: true }),
                        number(t("output"), { required: true }),
                        weight(),
                        section(t("utilisation"), [
                            number(t("self consumed")),
                            number(t("fed to livestock")),
                            number(t("sold to neighbour")),
                            number(t("sold for industrial use")),
                            number(t("wastage")),
                            ...other(),
                        ]),
                        section(t("important information"), [
                            ...soil(),
                            ...money(),
                            yesNo(t("required processing")),
                            text(t("Description(if applicable)", "Description (if applicable)")),
                            number(t("yields", "Yield")),
                            date(t("Month Planted", "Month planted")),
                            date(t("month harvested")),
                        ]),
                    ]),
                ],
            },
            {
                title: t("tree shrub grassland"),
                questions: [
                    group({ en: "Tree or shrub", ms: "Pokok atau pokok renek" }, [
                        ...what(
                            { en: "Tree or shrub", ms: "Pokok atau pokok renek" },
                            await from("tree_crops"),
                            t("tree shrub name")
                        ),
                        section(t("important information"), [
                            number(t("number trees"), { required: true }),
                            one(
                                t("average of tree"),
                                words(
                                    "0 to 5 years",
                                    "5 to 10 years",
                                    "10 to 20 years",
                                    "20 to 30 years",
                                    "30 to 50 years",
                                    "50 to 70 years"
                                )
                            ),
                            ...soil(),
                            ...money(),
                        ]),
                        products(true),
                    ]),
                ],
            },
            {
                title: t("livestock feed produce"),
                questions: [
                    group({ en: "Livestock", ms: "Ternakan" }, [
                        ...what(
                            { en: "Livestock", ms: "Ternakan" },
                            await from("poultry_crops"),
                            { en: "Livestock name", ms: "Nama ternakan" }
                        ),
                        section(t("important information"), [
                            number(t("number"), { required: true }),
                            number(t("average age of the live stocks")),
                            one(
                                { en: "Average age is measured in", ms: "Purata umur diukur dalam" },
                                [
                                    { value: "days", label: { en: "Days", ms: "Hari" } },
                                    { value: "weeks", label: { en: "Weeks", ms: "Minggu" } },
                                    { value: "months", label: { en: "Months", ms: "Bulan" } },
                                    { value: "years", label: { en: "Years", ms: "Tahun" } },
                                ]
                            ),
                            one(t("type of feed"), [...feeds, OTHERS]),
                            text(t("create type", "Other type of feed")),
                            weight(),
                        ]),
                        section({ en: "Feed", ms: "Makanan ternakan" }, [
                            number(t("total feed")),
                            number(t("self produced")),
                            number(t("neighbour", "From neighbours")),
                            number(t("purchased from market")),
                            ...other(),
                        ]),
                        ...money(),
                        yesNo({ en: "Steroids used", ms: "Steroid digunakan" }),
                        products(false),
                    ]),
                ],
            },
            {
                title: t("fishery"),
                children: [
                    {
                        title: t("harvested from pond", "Harvested from pond"),
                        questions: [await fish(true)],
                    },
                    {
                        title: t("harvested from river"),
                        questions: [await fish(false)],
                    },
                ],
            },
            {
                title: t("hunting"),
                questions: [
                    group({ en: "Animal hunted", ms: "Haiwan diburu" }, [
                        ...what(
                            { en: "Animal", ms: "Haiwan" },
                            await from("hunting_crops"),
                            { en: "Animal name", ms: "Nama haiwan" }
                        ),
                        number(t("number"), { required: true }),
                        weight(),
                        section(t("utilisation"), [
                            number(t("meat")),
                            number(t("self consumed")),
                            number(t("sold to neighbour")),
                            number({
                                en: "Sold in consumer market",
                                ms: "Dijual di pasaran pengguna",
                            }),
                            number(t("wastage")),
                            ...other(),
                        ]),
                        ...money(),
                        number(t("yields", "Yield")),
                        yesNo(t("required processing")),
                    ]),
                ],
            },
            {
                title: t("storage"),
                // The app's four fixed stocks; `type` on a storage method says
                // which stock it suits.
                questions: await Promise.all(
                    [
                        ["for grains", "grain"],
                        ["for poultry", "poultry"],
                        ["for meat", "meat"],
                        ["for fruits & vegetables", "vegetables & fruits"],
                    ].map(async ([key, type]) =>
                        section(t(key), [
                            number(t("quantity", "Quantity")),
                            one(t("storage method"), [
                                ...(await from("storage_methods", { type })),
                                OTHERS,
                            ]),
                            text({
                                en: "Other storage method",
                                ms: "Kaedah penyimpanan lain",
                            }),
                        ])
                    )
                ),
            },
            {
                title: t("selling channel"),
                questions: [
                    // The five the app offers. Values are the lowercase names
                    // the old `selling_channel_names` already stores.
                    many(
                        t("selling channel"),
                        words("local market", "agent", "ecommerce", "export", "none")
                    ),
                ],
            },
        ],
    };

    /* ---------------------------- Consumption --------------------------- */

    const types = await db.collection("consumption_types").find({}).toArray();
    if (types.length === 0) {
        warn('"consumption_types" is empty — Consumption has no screens');
    }
    // Anything labelled with a consumption type can be eaten: the app lists
    // all six master collections together.
    const edible = [
        "crops",
        "tree_crops",
        "poultry_crops",
        "hunting_crops",
        "fishery_crops",
        "consumptioncrops",
    ];
    const consumption = {
        title: t("consumption"),
        children: await Promise.all(
            types.map(async (type) => {
                const label = String(type._id);
                const lists = await Promise.all(
                    edible.map((collection) =>
                        db
                            .collection(collection)
                            .find({ label: { $in: [label, type._id] }, status: 1 })
                            .toArray()
                    )
                );
                const items = lists
                    .flat()
                    .map((doc) => ({
                        value: String(doc._id),
                        label: normaliseLocalised(doc.name),
                    }))
                    .filter((option) => option.label)
                    .sort((a, b) => a.label.en.localeCompare(b.label.en));

                const title = normaliseLocalised(type.name);
                title.en = title.en.charAt(0).toUpperCase() + title.en.slice(1);
                return {
                    title,
                    questions: [
                        group({ en: "Item", ms: "Barang" }, [
                            ...what(
                                { en: "Item", ms: "Barang" },
                                items,
                                t("consumption name")
                            ),
                            weight(),
                            number(t("total quantity"), { required: true }),
                            number(t("purchased from market")),
                            number(t("purchased from neighbour")),
                            number(t("self grown")),
                        ]),
                    ],
                };
            })
        ),
    };

    return [production, consumption];
};

module.exports = { buildAppTree };
