const { normaliseLocalised } = require("../utils/localised");

/**
 * The field officers' questionnaire, written out to MIRROR THE OFFICER
 * SCREENS of the app (its newer branch, `milestone2`: Screens/Officer).
 *
 * Not derived from the eight `*-officer` schemas the way the household census
 * is from its own, because a schema cannot say what those screens do, and
 * here it would also be wrong:
 *
 *   - which option list feeds which field is written down nowhere in the
 *     backend (no `ref`, nothing populated): only the screens know. Matching
 *     by name leaves 17 pickers empty and gives one the wrong list;
 *   - four fields keep an option id in a String (the land unit, and three on
 *     Mobility), and the house pictures are an array of file paths;
 *   - Community is ONE document typed over four screens: four pages here;
 *   - water sources, energy sources and establishments are lists: one
 *     repeatable group each, whose first field names the entry.
 *
 * What a screen shows only after a "Yes" is an ordinary question here, never
 * required (the questionnaire has no conditional display). It comes right
 * after the question it follows, in a section when there are three or more.
 * What a screen works out or checks across fields is said in a hint, and so
 * is the unit it prints beside a number. Required is only what the screen
 * requires whatever else was answered.
 *
 * Wording is the app's own English, its typos and capitals put right, and its
 * own Malay, both copied here from that branch's i18next bundles so the seed
 * does not need the app's folder. That Malay looks machine translated ("Type"
 * is "Taip", "Tapped into" is "Disentuh") and nobody has reviewed it. What
 * the bundles do not have was written for this file, Malay included, and is
 * no better checked: the root, the four Community pages, the sections, the
 * names of the three lists, the hints, and the few labels the app misspells,
 * builds as it runs or never translated.
 *
 * Option labels are the lists' own names, as stored: lower case, and their
 * `ms` / `dz` are mostly copies of the English.
 *
 * Three option types exist that no screen asks. They are left out:
 * `issues_determine_villagers_vote` (demographic), `loan_lending_organizations`
 * and `main_use_of_loans` (business).
 */

// The same small builders as app-screens.js, which keeps its own to itself.
const text = (label, extra = {}) => ({ type: "text", label, ...extra });
const number = (label, extra = {}) => ({ type: "number", label, min: 0, ...extra });
const yesNo = (label, extra = {}) => ({ type: "boolean", label, ...extra });
// `max` is how many pictures one answer may hold.
const photo = (label, extra = {}) => ({ type: "photo", label, ...extra });
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

// Wording the screens repeat under one facility after another.
const HOW_MANY = { en: "How many?", ms: "Berapa ramai?" };
const HOW_FAR = { en: "How far from village", ms: "Berapa jauh dari kampung" };
const TYPE = { en: "Type", ms: "Taip" };
const CAPACITY = { en: "Capacity", ms: "Kapasiti" };

// On the screens these four stand under what they follow ("Market", then
// "How many?"). On the dashboard a question stands alone, as a column, a
// chart and a filter, and nine questions called "How many?" cannot be told
// apart there. So on the Community pages each says what it is about:
// "Market: how many?".
const FOLLOWS = new Set([HOW_MANY, HOW_FAR, TYPE, CAPACITY]);
const lower = (words) => words.charAt(0).toLowerCase() + words.slice(1);
const named = (questions) => {
    let about;
    return questions.map((question) => {
        if (question.type === "boolean") about = question.label;
        if (!about || !FOLLOWS.has(question.label)) return question;
        const ask = question.label;
        return {
            ...question,
            label: {
                en: `${about.en}: ${lower(ask.en)}`,
                ms: `${about.ms || about.en}: ${lower(ask.ms)}`,
            },
        };
    });
};

const IN_LITRES = { en: "In litres", ms: "Dalam liter" };
// The screen's own heading over the three shares, and the sum it checks.
const OF_ELECTRICITY = {
    en: "Percentage distribution of village electricity. The total of central grid fossil, renewable and microgrid should be equal to 100.",
    ms: "Peratusan pengagihan elektrik kampung. Jumlah fosil grid pusat, boleh diperbaharui dan mikrogrid hendaklah sama dengan 100.",
};

const buildOfficerTree = async (db, warn = () => {}) => {
    /** Options from an officer option list; the document `_id` is the value. */
    const from = async (collection, filter = {}) => {
        const docs = await db.collection(collection).find(filter).toArray();
        const options = docs
            .map((doc) => ({
                value: String(doc._id),
                label: normaliseLocalised(doc.name),
            }))
            // English is the fallback every label needs: a row without it
            // would stop the seed halfway through writing the tree.
            .filter((option) => option.label?.en)
            // Many of these lists are counts and distances: "2" before "10".
            .sort((a, b) =>
                a.label.en.localeCompare(b.label.en, undefined, { numeric: true })
            );
        if (options.length === 0) {
            warn(
                `"${collection}" has no usable rows of type "${filter.type}" — its picker would be empty`
            );
        }
        return options;
    };
    const water = (type) => from("water_officer_dropdowns", { type });
    const energy = (type) => from("energy_officer_dropdowns", { type });
    const mobility = (type) => from("mobility_officer_dropdowns", { type });
    const forestry = (type) => from("forestry_officer_dropdowns", { type });
    const community = (type) => from("community_officer_dropdowns", { type });

    /* ---------------------------- Demographic --------------------------- */

    const demographic = {
        title: { en: "Demographic information", ms: "Maklumat demografi" },
        questions: [
            // A village that is shrinking has a negative rate. The floor is
            // below zero and said: that is how the app knows to offer a
            // minus sign on the keyboard.
            number(
                {
                    en: "Average population growth rate",
                    ms: "Kadar pertumbuhan penduduk purata",
                },
                {
                    required: true,
                    min: -100,
                    helper_text: { en: "In %", ms: "Dalam %" },
                }
            ),
            text(
                { en: "Common land measurement unit", ms: "Unit ukuran tanah biasa" },
                { required: true }
            ),
            // The screen prints the unit typed above inside this label ("How
            // much <unit> is equal to 1 acre"). A label here is fixed text.
            number(
                {
                    en: "How much of that unit is equal to 1 acre",
                    ms: "Berapa banyak unit itu adalah sama dengan 1 ekar",
                },
                { required: true }
            ),
            text(
                { en: "What is the local language?", ms: "Apakah bahasa tempatan?" },
                { required: true }
            ),
            text(
                {
                    en: "Common traditional house type",
                    ms: "Jenis rumah tradisional biasa",
                },
                { required: true }
            ),
            // Several pictures in one answer. The old field kept disk paths,
            // which the host cannot write; the screen lets it stay empty.
            photo(
                { en: "Upload house picture", ms: "Muat naik gambar rumah" },
                { max: 10 }
            ),
        ],
    };

    /* ---------------------------- Landholding --------------------------- */

    const landholding = {
        title: {
            en: "Landholding & usage mapping",
            ms: "Pemetaan tanah & penggunaan",
        },
        questions: [
            number(
                {
                    en: "Total area allocated to the village",
                    ms: "Jumlah kawasan yang diperuntukkan kepada kampung",
                },
                { required: true }
            ),
            // As the screen has it: two units typed into the app itself, each
            // under an id that is in no collection ("km" for an area is the
            // screen's too). The ids stay the values, so what the old screen
            // saved is one of these two options.
            one(
                { en: "Unit" },
                [
                    { value: "6736117ecb51156c2f52383e", label: { en: "ha" } },
                    { value: "6736117ecb51156c2f52683e", label: { en: "km" } },
                ],
                { required: true }
            ),
            number(
                {
                    en: "Total area allocated for community infrastructure including mobility",
                    ms: "Jumlah kawasan yang diperuntukkan untuk infrastruktur komuniti termasuk mobiliti",
                },
                { required: true }
            ),
            // The screen fills this in by itself from the two areas above,
            // and refuses the four parts below when they add up to more.
            number(
                { en: "Unutilized area", ms: "Kawasan yang tidak digunakan" },
                {
                    required: true,
                    helper_text: {
                        en: "The total area allocated to the village less the area allocated for community infrastructure including mobility. Fallow, under forest, under grassland and others together must not exceed it.",
                        ms: "Jumlah kawasan yang diperuntukkan kepada kampung tolak kawasan yang diperuntukkan untuk infrastruktur komuniti termasuk mobiliti. Jumlah fallow, di bawah hutan, di bawah padang rumput dan lain-lain tidak boleh melebihinya.",
                    },
                }
            ),
            // Shown by the screen only when some area is unutilized.
            section(
                {
                    en: "Of the unutilized area",
                    ms: "Daripada kawasan yang tidak digunakan",
                },
                [
                    number({ en: "Fallow" }),
                    number({ en: "Under forest", ms: "Di bawah hutan" }),
                    number({ en: "Under grassland", ms: "Di bawah padang rumput" }),
                    number({ en: "Others (if any)", ms: "Lain-lain (jika ada)" }),
                ]
            ),
            number(
                {
                    en: "Land owned by non resident",
                    ms: "Tanah milik bukan pemastautin",
                },
                { required: true }
            ),
            number(
                {
                    en: "Total area privately owned",
                    ms: "Jumlah kawasan milik persendirian",
                },
                { required: true }
            ),
        ],
    };

    /* ------------------------------- Water ------------------------------ */

    const waterPage = {
        title: { en: "Water", ms: "Air" },
        questions: [
            // The screen ticks the sources in one picker and opens a block
            // for each; here an entry is added per source, named by it.
            group(
                { en: "Water source", ms: "Sumber air" },
                [
                    one(
                        { en: "Water source", ms: "Sumber air" },
                        await water("water_source"),
                        { required: true }
                    ),
                    one({ en: "Condition", ms: "Keadaan" }, await water("condition"), {
                        required: true,
                    }),
                    one(
                        { en: "Tapped into", ms: "Disentuh" },
                        await water("tapped_into"),
                        { required: true }
                    ),
                    number(
                        {
                            en: "Potential sustainable yearly supply",
                            ms: "Potensi bekalan tahunan yang mampan",
                        },
                        { required: true, helper_text: IN_LITRES }
                    ),
                    number(
                        {
                            en: "Present yearly consumption",
                            ms: "Penggunaan tahunan semasa",
                        },
                        { required: true, helper_text: IN_LITRES }
                    ),
                    number({
                        en: "Storage capacity (if any)",
                        ms: "Kapasiti storan (jika ada)",
                    }),
                    one(
                        { en: "Distribution method", ms: "Kaedah pengedaran" },
                        await water("distribution_method"),
                        { required: true }
                    ),
                    one(
                        { en: "Storage method", ms: "Kaedah penyimpanan" },
                        await water("storage_method"),
                        { required: true }
                    ),
                    number(
                        { en: "Rate of replenishment", ms: "Kadar pengisian semula" },
                        {
                            required: true,
                            helper_text: {
                                en: "In inches per year",
                                ms: "Dalam inci setahun",
                            },
                        }
                    ),
                ],
                {
                    required: true,
                    helper_text: {
                        en: "One entry for each water source available at the village level",
                        ms: "Satu entri bagi setiap sumber air yang terdapat di peringkat kampung",
                    },
                }
            ),
            yesNo(
                {
                    en: "Is there any community sewage treatment plant?",
                    ms: "Adakah terdapat loji rawatan kumbahan komuniti?",
                },
                { required: true }
            ),
            section({ en: "Sewage treatment plant", ms: "Loji rawatan kumbahan" }, [
                number(CAPACITY, { helper_text: IN_LITRES }),
                one(
                    {
                        en: "Where is the treated water discharged",
                        ms: "Di mana air terawat dilepaskan",
                    },
                    await water("treated_water_discharged")
                ),
                number({
                    en: "Number of houses in the collection network",
                    ms: "Bilangan rumah dalam rangkaian pengumpulan",
                }),
            ]),
        ],
    };

    /* ------------------------------ Energy ------------------------------ */

    const energyPage = {
        title: { en: "Energy & fuel", ms: "Tenaga & bahan api" },
        questions: [
            // One entry per source, as for water. This is the whole page, so
            // the app draws it as a list.
            group(
                {
                    en: "Renewable energy source",
                    ms: "Sumber tenaga boleh diperbaharui",
                },
                [
                    one(
                        {
                            en: "Renewable energy source",
                            ms: "Sumber tenaga boleh diperbaharui",
                        },
                        await energy("type_of_energy_sources"),
                        { required: true }
                    ),
                    yesNo(
                        {
                            en: "Is the village using this energy source?",
                            ms: "Adakah kampung menggunakan sumber tenaga ini?",
                        },
                        { required: true }
                    ),
                    // As the screen has it: the split of the village's
                    // electricity and the way to a fuel pump are asked again
                    // under every source, and stored with each.
                    section(
                        {
                            en: "Use of this energy source",
                            ms: "Penggunaan sumber tenaga ini",
                        },
                        [
                            number(CAPACITY, {
                                helper_text: { en: "In kWh", ms: "Dalam kWh" },
                            }),
                            many(
                                { en: "Distribution method", ms: "Kaedah pengedaran" },
                                await energy("distribution_method")
                            ),
                            number(
                                { en: "Installation cost", ms: "Kos pemasangan" },
                                {
                                    helper_text: {
                                        en: "In your currency",
                                        ms: "Dalam mata wang anda",
                                    },
                                }
                            ),
                            number(
                                {
                                    en: "Central grid fossil based",
                                    ms: "Berasaskan fosil grid pusat",
                                },
                                { max: 100, helper_text: OF_ELECTRICITY }
                            ),
                            number(
                                {
                                    en: "Central grid renewable",
                                    ms: "Grid pusat boleh diperbaharui",
                                },
                                { max: 100, helper_text: OF_ELECTRICITY }
                            ),
                            number(
                                {
                                    en: "Local renewable microgrid",
                                    ms: "Microgrid tempatan boleh diperbaharui",
                                },
                                { max: 100, helper_text: OF_ELECTRICITY }
                            ),
                            one(
                                {
                                    en: "How far are petrol or diesel pumps?",
                                    ms: "Berapa jauh pam petrol atau diesel?",
                                },
                                await energy("distance_of_fuel_pumps")
                            ),
                        ]
                    ),
                ],
                {
                    required: true,
                    helper_text: {
                        en: "One entry for each renewable energy source available",
                        ms: "Satu entri bagi setiap sumber tenaga boleh diperbaharui yang tersedia",
                    },
                }
            ),
        ],
    };

    /* ----------------------------- Mobility ----------------------------- */

    const requirements = await mobility("mobility_requirements");
    const mobilityPage = {
        title: { en: "Mobility", ms: "Mobiliti" },
        questions: [
            // Counts of houses, though the old schema keeps them as text.
            number(
                {
                    en: "Houses connected to internal road",
                    ms: "Rumah yang bersambung dengan jalan dalaman",
                },
                { required: true }
            ),
            number(
                {
                    en: "Houses not connected to internal road",
                    ms: "Rumah tidak bersambung dengan jalan dalaman",
                },
                { required: true }
            ),
            yesNo(
                {
                    en: "Village connectivity to highway",
                    ms: "Sambungan kampung ke lebuh raya",
                },
                { required: true }
            ),
            many({ en: "Mobility requirement", ms: "Keperluan mobiliti" }, requirements, {
                required: true,
            }),
            text({ en: "Reason", ms: "Sebab" }, { required: true }),
            // As the screen has it: this picker offers the mobility
            // requirements again. No list of road conditions exists, so it
            // is not required here (the screen requires it): a page must not
            // be held back for an answer that can only be a wrong one, which
            // would then lock these options in place.
            one(
                { en: "Condition of internal roads", ms: "Keadaan jalan dalaman" },
                requirements
            ),
            yesNo(
                { en: "Safety issues on roads", ms: "Isu keselamatan di jalan raya" },
                { required: true }
            ),
            text({ en: "If yes, describe", ms: "Jika ya, huraikan" }),
            one(
                {
                    en: "Connectivity to healthcare facilities",
                    ms: "Ketersambungan kepada kemudahan penjagaan kesihatan",
                },
                await mobility("connectivity_to_healthcare_facilities"),
                { required: true }
            ),
            yesNo(
                {
                    en: "Road infrastructure damaged due to flooding or landslides",
                    ms: "Infrastruktur jalan raya rosak akibat banjir atau tanah runtuh",
                },
                { required: true }
            ),
            // The screen always demands this one. Not here: a village whose
            // road is never damaged has nothing to pick.
            one(
                {
                    en: "How frequently the road gets damaged due to flooding or landslides?",
                    ms: "Berapa kerapkah jalan raya rosak akibat banjir atau tanah runtuh?",
                },
                await mobility("frequency_of_road_damage")
            ),
        ],
    };

    /* ----------------------------- Forestry ----------------------------- */

    const forestryPage = {
        title: { en: "Forestry & timber", ms: "Perhutanan & kayu" },
        questions: [
            one(
                {
                    en: "Type of forest accessible",
                    ms: "Jenis hutan yang boleh diakses",
                },
                await forestry("type_of_forest_accessible"),
                { required: true }
            ),
            number(
                {
                    en: "Area of forest accessible",
                    ms: "Kawasan hutan yang boleh diakses",
                },
                { required: true }
            ),
            yesNo({
                en: "Do you have flora & fauna survey done for the village?",
                ms: "Adakah anda mempunyai tinjauan flora & fauna untuk kampung?",
            }),
            // As the screen has it: everything below is shown only to a
            // village that has a survey, the state of its forest included,
            // and the last two only after a wildlife conflict.
            section({ en: "Flora & fauna survey", ms: "Tinjauan flora & fauna" }, [
                text({ en: "Share the link of the doc", ms: "Kongsi pautan doc" }),
                one(
                    {
                        en: "Condition of forest accessible",
                        ms: "Keadaan hutan boleh diakses",
                    },
                    await forestry("condition_of_forest_accessible")
                ),
                one(
                    { en: "Incident of forest fire", ms: "Kejadian kebakaran hutan" },
                    await forestry("incident_of_forest_fire")
                ),
                yesNo({
                    en: "Incident of wildlife conflict",
                    ms: "Insiden konflik hidupan liar",
                }),
                text({ en: "Describe", ms: "Huraikan" }),
                text({
                    en: "Any incidents of illegal forest activities?",
                    ms: "Sebarang kejadian aktiviti hutan haram?",
                }),
            ]),
        ],
    };

    /* ----------------------------- Business ----------------------------- */

    const business = {
        title: {
            en: "Business & commercial establishments/organisations",
            ms: "Pertubuhan/pertubuhan perniagaan & komersial",
        },
        questions: [
            yesNo(
                {
                    en: "Any other establishment/organisation not owned by villagers",
                    ms: "Mana-mana pertubuhan/pertubuhan lain yang bukan milik penduduk kampung",
                },
                { required: true }
            ),
            // The screen asks how many and opens that many blocks, "Type 1",
            // "Type 2"; here an entry is added for each and named by its
            // name. The screen shows the blocks whatever was answered above.
            group({ en: "Establishment/organisation", ms: "Pertubuhan" }, [
                text({ en: "Name", ms: "Nama" }, { required: true }),
                text(TYPE, { required: true }),
                // The screen offers 1900 to this year. (The app prints a
                // number with a comma, "2,015": it has no way yet to be
                // told that a number is not a quantity.)
                number(
                    { en: "Year started", ms: "Tahun bermula" },
                    { required: true, min: 1900, max: 2100 }
                ),
                text({ en: "Purpose", ms: "Tujuan" }, { required: true }),
            ]),
        ],
    };

    /* ------------------------ Community infrastructure ------------------ */

    // One page per screen of the app's four, in the order it walks them.
    // Every "How many?" is some choices from a list of counts, not a number:
    // that is what the screens offer and what the old documents hold.
    const communityPages = [
        {
            title: {
                en: "Town hall, market, bank & health care",
                ms: "Dewan bandaran, pasaran, bank & penjagaan kesihatan",
            },
            questions: [
                yesNo({ en: "Town hall", ms: "Dewan bandaran" }, { required: true }),
                // As the screen has it: "Purpose" picks from the list of how
                // many town halls there are. No list of purposes exists.
                many({ en: "Purpose", ms: "Tujuan" }, await community("no_of_townhall")),
                yesNo({ en: "Market", ms: "Pasaran" }, { required: true }),
                many(HOW_MANY, await community("no_of_market")),
                yesNo({ en: "Bank" }, { required: true }),
                many(HOW_MANY, await community("no_of_bank")),
                one(HOW_FAR, await community("distance_of_bank")),
                yesNo({ en: "Health care", ms: "Penjagaan kesihatan" }, { required: true }),
                many(HOW_MANY, await community("no_of_healthcare")),
                one(HOW_FAR, await community("distance_of_healthcare")),
                yesNo({ en: "Library", ms: "Perpustakaan" }, { required: true }),
                many(HOW_MANY, await community("no_of_library")),
                yesNo({ en: "Museum", ms: "Muzium" }, { required: true }),
                many(HOW_MANY, await community("no_of_museum")),
            ],
        },
        {
            title: {
                en: "Sports, spiritual places & waste",
                ms: "Sukan, tempat rohani & sisa",
            },
            questions: [
                yesNo({ en: "Sports", ms: "Sukan" }, { required: true }),
                many(
                    { en: "Kind of sports?", ms: "Jenis sukan?" },
                    await community("kind_of_sports")
                ),
                yesNo({ en: "Spiritual retreats", ms: "Retret rohani" }, { required: true }),
                one(
                    { en: "How frequently?", ms: "Berapa kerap?" },
                    await community("frequency_of_spiritual_retreats")
                ),
                yesNo(
                    { en: "Spiritual sanctums", ms: "Tempat suci rohani" },
                    { required: true }
                ),
                many(HOW_MANY, await community("no_of_spiritual_sanctums")),
                yesNo({ en: "Post office", ms: "Pejabat pos" }, { required: true }),
                many(HOW_MANY, await community("no_of_post_office")),
                one(HOW_FAR, await community("post_office_distance")),
                yesNo(
                    {
                        en: "Sewage treatment facility",
                        ms: "Kemudahan rawatan kumbahan",
                    },
                    { required: true }
                ),
                many(HOW_MANY, await community("no_of_sewage_treatment_facility")),
                many(
                    { en: "Sewage type", ms: "Jenis kumbahan" },
                    await community("types_of_sewage_treatment_facility")
                ),
                // "Composing" on the screen. Its lists are about composting,
                // and the app's Malay translates the misspelling.
                yesNo(
                    { en: "Composting facility", ms: "Kemudahan pengkomposan" },
                    { required: true }
                ),
                many(HOW_MANY, await community("no_of_composting_facility")),
                many(
                    { en: "Composting type", ms: "Jenis pengkomposan" },
                    await community("types_of_composting_facility")
                ),
                yesNo({ en: "Recycling", ms: "Kitar semula" }, { required: true }),
                many(
                    { en: "Recycling type", ms: "Jenis kitar semula" },
                    await community("types_of_recycling_facility")
                ),
                // "Water segregation" on the screen. Its list is the level
                // of WASTE segregation, among the other waste questions.
                yesNo(
                    { en: "Waste segregation", ms: "Pengasingan sisa" },
                    { required: true }
                ),
                many(
                    { en: "Level of segregation", ms: "Tahap pengasingan" },
                    await community("level_of_waste_segregation")
                ),
            ],
        },
        {
            title: {
                en: "Street lights, internet & public places",
                ms: "Lampu jalan, internet & tempat awam",
            },
            questions: [
                yesNo({ en: "Street lights", ms: "Lampu jalan" }, { required: true }),
                one(
                    { en: "Solar or electric", ms: "Suria atau elektrik" },
                    await community("type_of_street_lights")
                ),
                yesNo(
                    { en: "Broadband internet", ms: "Internet jalur lebar" },
                    { required: true }
                ),
                // Not the question's own name: the editor, the Publish dialog
                // and History name a row by its label alone.
                section(
                    {
                        en: "Broadband internet details",
                        ms: "Butiran internet jalur lebar",
                    },
                    [
                        many(
                            { en: "How many providers?", ms: "Berapa ramai pembekal?" },
                            await community("no_of_broadband_providers")
                        ),
                        many(
                            { en: "Method of using", ms: "Kaedah penggunaan" },
                            await community("method_of_broadband")
                        ),
                        many(
                            { en: "Bandwidth", ms: "Lebar jalur" },
                            await community("bandwidth_of_broadband")
                        ),
                        many(
                            { en: "Stability", ms: "Kestabilan" },
                            await community("stability_of_broadband")
                        ),
                    ]
                ),
                yesNo({ en: "Burial ground", ms: "Tanah perkuburan" }, { required: true }),
                one(HOW_FAR, await community("distance_of_burial_cremation")),
                yesNo(
                    { en: "Animal shelters", ms: "Tempat perlindungan haiwan" },
                    { required: true }
                ),
                one(HOW_FAR, await community("distance_of_animal_shelters")),
                many(TYPE, await community("type_of_animal_shelters")),
                yesNo({ en: "Parking", ms: "Tempat letak kereta" }, { required: true }),
                one(CAPACITY, await community("capacity_of_parking")),
                yesNo(
                    {
                        en: "Children playground",
                        ms: "Taman permainan kanak-kanak",
                    },
                    { required: true }
                ),
                many(TYPE, await community("type_of_children_playground")),
                yesNo({ en: "Senile centre", ms: "Pusat nyanyuk" }, { required: true }),
                many(TYPE, await community("type_of_senile_center")),
            ],
        },
        {
            title: {
                en: "Mobility, storage & media",
                ms: "Mobiliti, penyimpanan & media",
            },
            questions: [
                yesNo({ en: "Mobility", ms: "Mobiliti" }, { required: true }),
                many(
                    {
                        en: "Type of mobility accessible from the village",
                        ms: "Jenis mobiliti boleh diakses dari kampung",
                    },
                    await community("type_of_mobility")
                ),
                yesNo({ en: "Water storage", ms: "Penyimpanan air" }, { required: true }),
                many(CAPACITY, await community("capacity_of_water_storage")),
                yesNo(
                    {
                        en: "Cold storage for perishable items",
                        ms: "Cold storage untuk barang mudah rosak",
                    },
                    { required: true }
                ),
                many(TYPE, await community("type_of_cold_storage")),
                one(CAPACITY, await community("capacity_of_cold_storage")),
                yesNo(
                    { en: "Energy & battery house", ms: "Rumah tenaga & bateri" },
                    { required: true }
                ),
                many(TYPE, await community("type_of_energy_and_battery_house")),
                one(CAPACITY, await community("capacity_of_energy_and_battery_house")),
                text({ en: "Others (if any)", ms: "Lain-lain (jika ada)" }),
                yesNo(
                    {
                        en: "Access to newspaper, TV & radio",
                        ms: "Akses kepada akhbar, TV & radio",
                    },
                    { required: true }
                ),
            ],
        },
    ].map((page) => ({ ...page, questions: named(page.questions) }));

    // One root: the survey of a village, opening on eight tiles as the
    // officer home of the app does.
    return [
        {
            title: { en: "Village survey", ms: "Tinjauan kampung" },
            children: [
                demographic,
                landholding,
                waterPage,
                energyPage,
                mobilityPage,
                forestryPage,
                business,
                {
                    title: {
                        en: "Community infrastructure",
                        ms: "Infrastruktur komuniti",
                    },
                    children: communityPages,
                },
            ],
        },
    ];
};

module.exports = { buildOfficerTree };
