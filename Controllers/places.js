const Joi = require("joi");
const { countries: COUNTRY_DATA } = require("countries-list");
const Countries = require("../Models/countries");
const Regions = require("../Models/regions");
const Villages = require("../Models/villages");
const Admin = require("../Models/admin");
const Users = require("../Models/user");
const Questions = require("../Models/questions");
const Categories = require("../Models/categories");
const PlaceOverrides = require("../Models/placeOverrides");
const Counters = require("../Models/counters");
const History = require("../Models/questionnaireHistory");
const AppError = require("../AppError");
const {
    LEVELS,
    listPlaces,
    indexPlaces,
    chainOf,
    subtreeIds,
    villagesUnder,
    languagesFor,
    scopeOf,
    shown,
} = require("../utils/places");
const { placeDiffs } = require("../utils/editorPayload");
const { loadEffective } = require("../utils/liveQuestionnaire");
const { countAnswers, storeFor } = require("../utils/responseStores");

// Every read goes through utils/places.js. A write cannot: it has to name the
// collection that kind of place is kept in.
const MODELS = { country: Countries, region: Regions, village: Villages };

const same = (a, b) => String(a) === String(b);

/** "sub_district" is the stored key; a person reads "sub-district". */
const levelName = (level) => level.replace("_", "-");

/** Unknown, malformed and already deleted all get the same answer. */
const findPlace = (byId, id) => {
    // From a path or a query string: text, or nothing we know.
    const place = typeof id === "string" ? byId.get(id.toLowerCase()) : null;
    if (!place) throw new AppError(0, "Place not found", 404);
    return place;
};

/**
 * A place sits inside a place of a higher level: a district in a state or in
 * a country, never in another district or in a village. Levels may be skipped
 * (a village straight under its country), so this compares the two rather
 * than expecting the next level down.
 */
const assertFits = (level, parent) => {
    if (LEVELS.indexOf(level) <= LEVELS.indexOf(parent.level)) {
        throw new AppError(
            0,
            `A ${levelName(level)} cannot sit inside a ${levelName(parent.level)}.`,
            400
        );
    }
};

/**
 * A unique index refusing a write is the caller's duplicate, not a server
 * fault — and the error handler's own answer to 11000 is "Email already
 * exists", which is no help here.
 */
const duplicateAs = (message) => (error) => {
    throw error?.code === 11000 ? new AppError(0, message, 409) : error;
};
const villageTaken = (name) =>
    `A village called "${name}" already exists. Village names must be unique for now: add the district or state to the name.`;
const placeTaken = (name) => `A place called "${name}" already exists here.`;

/**
 * What scripts/backfill-country-ids.js fills in for a country it creates.
 * Nothing when countries-list has no country of that name; the model's blank
 * defaults then stand and the fields can be set later.
 */
const countryData = (name) => {
    const match = Object.entries(COUNTRY_DATA).find(
        ([, data]) => data.name.toLowerCase() === name.toLowerCase()
    );
    if (!match) return {};
    const [iso2, data] = match;
    return {
        iso2,
        phone_code: String(data.phone).split(",")[0].replace(/\D/g, ""),
        currency: String(data.currency).split(",")[0],
    };
};

/**
 * The villagers registered in a village. They are tied to it by its name,
 * and matched without case (utils/geoResolver.js), so they are counted that
 * way too: an account holding "Rukha" lives in "rukha".
 */
const villagersIn = (village) =>
    Users.countDocuments({
        $expr: {
            $eq: [
                { $toLower: { $ifNull: ["$village_name", ""] } },
                String(village.name).toLowerCase(),
            ],
        },
    });

/**
 * What a move would leave behind: the questionnaire work of the place (and
 * of the places inside it) that hangs on something a place it is LEAVING
 * added — a switch or a wording set on that place's question, a question of
 * its own on that place's page or in its group, a category in its group.
 * Outside that place's branch none of it is asked or even listed any more,
 * and it could never be removed. A count; 0 when the move is clean.
 */
const strandedBy = async (place, parent, places) => {
    const staying = new Set(chainOf(parent).map(String));
    const leaving = place.path.filter((id) => !staying.has(String(id)));
    if (leaving.length === 0) return 0;

    const owned = { ownerPlaceId: { $in: leaving } };
    const [theirQuestions, theirCategories] = await Promise.all([
        Questions.find(owned).select({ _id: 1 }).lean(),
        Categories.find(owned).select({ _id: 1 }).lean(),
    ]);
    const questionIds = theirQuestions.map((doc) => doc._id);
    const categoryIds = theirCategories.map((doc) => doc._id);
    if (questionIds.length + categoryIds.length === 0) return 0;

    const moving = subtreeIds(place._id, places);
    const counts = await Promise.all([
        PlaceOverrides.countDocuments({
            placeId: { $in: moving },
            targetId: { $in: [...questionIds, ...categoryIds] },
        }),
        Questions.countDocuments({
            ownerPlaceId: { $in: moving },
            $or: [
                { categoryId: { $in: categoryIds } },
                { parentQuestionId: { $in: questionIds } },
            ],
        }),
        Categories.countDocuments({
            ownerPlaceId: { $in: moving },
            parentId: { $in: categoryIds },
        }),
    ]);
    return counts.reduce((total, count) => total + count, 0);
};

/** The place as listPlaces() gives it, read back after a write. */
const freshPlace = async (id) =>
    indexPlaces(await listPlaces()).get(String(id));

module.exports.get_places = async (req, res) => {
    const all = await listPlaces();
    const byId = indexPlaces(all);
    const scope = scopeOf(res.locals.admin, all);

    // A regional account gets its own place and what is inside it, plus the
    // places above — those only so that names and breadcrumbs can be shown.
    let places = all;
    if (scope) {
        const above = new Set(byId.get(String(scope.rootId)).path.map(String));
        places = all
            .filter(
                (place) =>
                    above.has(String(place._id)) ||
                    scope.ids.has(String(place._id))
            )
            .map((place) => ({
                ...place,
                managed: scope.ids.has(String(place._id)),
            }));
    }

    if (!["1", "true"].includes(req.query.stats)) return res.json(places);

    const accounts = await Admin.find({
        role: "regional",
        placeId: { $ne: null },
    })
        .select({ name: 1, email: 1, placeId: 1 })
        .lean();
    const teamAt = new Map();
    accounts.forEach(({ _id, name, email, placeId }) => {
        const key = String(placeId);
        teamAt.set(key, [...(teamAt.get(key) || []), { _id, name, email }]);
    });

    const brief = (place) =>
        place ? { _id: place._id, name: place.name } : null;

    // How each place differs from the Master (the overview of all places,
    // and the Locations column). Asked for separately — it reads the whole
    // questionnaire — and a super admin's only: the Master is in it.
    // The villagers' questionnaire, that is: the field officers' has no
    // place versions, and would only be counted as "not asked" anywhere.
    let diffs = null;
    if (["1", "true"].includes(req.query.diff) && !scope) {
        const [{ categories, questions }, overrides] = await Promise.all([
            loadEffective(),
            PlaceOverrides.find().lean(),
        ]);
        diffs = placeDiffs({ places: all, categories, questions, overrides });
    }

    return res.json(
        places.map((place) => ({
            ...place,
            // ponytail: one pass over the whole list per place. Count along
            // each village's path instead if places reach the tens of
            // thousands.
            // Not for a place above a regional account: its count would
            // include villages in sibling places that account cannot see.
            ...(place.kind !== "village" &&
                place.managed !== false && {
                    villageCount: villagesUnder(place._id, all).length,
                }),
            languagesFrom: brief(languagesFor(place, byId).from),
            // A place above a regional account is listed for its name only:
            // who signs in there is not that account's to read.
            team:
                place.managed === false
                    ? []
                    : teamAt.get(String(place._id)) || [],
            // The nearest place ABOVE with a team, whether or not this one
            // has its own: the team that covers it by inheritance.
            teamFrom:
                place.managed === false
                    ? null
                    : brief(
                          [...place.path]
                              .reverse()
                              .map((id) => byId.get(String(id)))
                              .find(
                                  (upper) =>
                                      upper && teamAt.has(String(upper._id))
                              )
                      ),
            // How its published questionnaire differs from the Master (see
            // utils/editorPayload.js placeDiffs). null also when it was not
            // asked for.
            diff: diffs ? diffs.get(String(place._id)) : null,
        }))
    );
};

module.exports.add_place = async (req, res) => {
    const schema = Joi.object({
        name: Joi.string().trim().required(),
        level: Joi.string()
            .valid(...LEVELS)
            .required(),
        // A country has no parent: whatever is sent for one is dropped.
        parentId: Joi.when("level", {
            is: "country",
            then: Joi.any().strip(),
            otherwise: Joi.string().required(),
        }),
        languages: Joi.array().items(Joi.string().trim()).optional(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const { name, level } = value;
    const languages = [...new Set(value.languages || [])];

    let created;
    if (level === "country") {
        created = await Countries.create({
            // Lowercased by the model: the join key back to villages.country
            // and user.country. What was typed is kept for display.
            name,
            display_name: name,
            ...countryData(name),
            // English is always kept: the stored fallback for every label.
            languages: [...new Set(["en", ...languages])],
        }).catch(duplicateAs(placeTaken(name)));
    } else {
        const parent = findPlace(
            indexPlaces(await listPlaces()),
            value.parentId
        );
        assertFits(level, parent);
        const regionId = parent.kind === "region" ? parent._id : null;

        if (level === "village") {
            // The `country` string is still what everything older joins on.
            const country = await Countries.findById(parent.countryId)
                .select({ name: 1 })
                .lean();
            created = await Villages.create({
                name,
                country: country.name,
                countryId: parent.countryId,
                regionId,
                languages,
            }).catch(duplicateAs(villageTaken(name)));
        } else {
            created = await Regions.create({
                name,
                level,
                countryId: parent.countryId,
                parentId: regionId,
                // The regions above it, root first. A place's chain starts
                // at its country, which a region's stored path leaves out.
                path: chainOf(parent).slice(1),
                languages,
            }).catch(duplicateAs(placeTaken(name)));
        }
    }

    return res.json(await freshPlace(created._id));
};

module.exports.edit_place = async (req, res) => {
    const schema = Joi.object({
        name: Joi.string().trim().optional(),
        languages: Joi.array().items(Joi.string().trim()).optional(),
        // null is "not moving", which is what a form that only renames sends.
        parentId: Joi.string().allow(null, "").optional(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const places = await listPlaces();
    const byId = indexPlaces(places);
    const place = findPlace(byId, req.params.id);

    if (place.kind === "country" && value.parentId) {
        throw new AppError(
            0,
            "A country cannot sit inside another place.",
            400
        );
    }

    // Naming the parent it already has is not a move.
    const parent =
        value.parentId && !same(value.parentId.toLowerCase(), place.parentId)
            ? findPlace(byId, value.parentId)
            : null;
    if (parent) {
        // The level rule already keeps a place out of its own subtree, but
        // only while every stored level is right; a loop would drop the
        // whole branch out of the tree, so it is checked on its own.
        if (subtreeIds(place._id, places).some((id) => same(id, parent._id))) {
            throw new AppError(
                0,
                "A place cannot be moved inside itself.",
                400
            );
        }
        assertFits(place.level, parent);
        if (!same(parent.countryId, place.countryId)) {
            throw new AppError(
                0,
                `A ${levelName(place.level)} can only be moved within its own country.`,
                400
            );
        }
        const stranded = await strandedBy(place, parent, places);
        if (stranded > 0) {
            throw new AppError(
                0,
                `This ${levelName(place.level)} cannot be moved yet: ${stranded} of its questionnaire change(s) depend on what a place above it added, and would be left behind. Undo them in its questionnaire first.`,
                409
            );
        }
    }

    const patch = {};
    if (value.languages) {
        // A country always keeps English: it is the stored fallback for
        // every label. Lower down, an empty list means "as the place above".
        patch.languages = [
            ...new Set(
                place.kind === "country"
                    ? ["en", ...value.languages]
                    : value.languages
            ),
        ];
    }

    let taken = placeTaken(value.name || place.name);
    // The place's own write goes first and the batch is ordered, so a
    // duplicate name stops it before any path below has changed.
    const writes = [];

    if (place.kind === "country") {
        // Display only. The lowercase `name` is the join key back to
        // villages.country and user.country and never changes.
        if (value.name) patch.display_name = value.name;
    } else if (place.kind === "region") {
        if (value.name) patch.name = value.name;
        if (parent) {
            patch.parentId = parent.kind === "region" ? parent._id : null;
            patch.path = chainOf(parent).slice(1);
            // Every region below keeps its chain from this one down; only
            // what is above it changes. Villages point at their region and
            // need nothing.
            places
                .filter(
                    (below) =>
                        below.kind === "region" &&
                        below.path.some((id) => same(id, place._id))
                )
                .forEach((below) =>
                    writes.push({
                        updateOne: {
                            filter: { _id: below._id },
                            update: {
                                $set: {
                                    path: [
                                        ...patch.path,
                                        ...below.path.slice(place.depth),
                                    ],
                                },
                            },
                        },
                    })
                );
        }
    } else {
        // Lowercased here: the schema's setter is not something to rely on
        // for an update.
        const name = value.name?.toLowerCase();
        if (name && name !== place.name) {
            // Villagers are tied to their village by its name, so renaming it
            // would cut them loose.
            const villagers = await villagersIn(place);
            if (villagers > 0) {
                throw new AppError(
                    0,
                    `${villagers} villager(s) are registered in this village, so it cannot be renamed.`,
                    409
                );
            }
            patch.name = name;
            taken = villageTaken(value.name);
        }
        if (parent) {
            patch.regionId = parent.kind === "region" ? parent._id : null;
        }
    }

    if (Object.keys(patch).length > 0) {
        writes.unshift({
            updateOne: { filter: { _id: place._id }, update: { $set: patch } },
        });
        await MODELS[place.kind].bulkWrite(writes).catch(duplicateAs(taken));
    }
    // An officer's response carries a copy of its village's name, which the
    // Officer responses table shows and searches. (A villager's carries what
    // the villager typed, and their village is not renamed.) Asked of the
    // request, not of the patch: a rename whose second write failed is put
    // right by sending it again, when the village itself already has the name.
    if (place.kind === "village" && value.name) {
        const villageName = value.name.toLowerCase();
        await storeFor("officer").updateMany(
            { villageId: place._id, villageName: { $ne: villageName } },
            { $set: { villageName } },
            { timestamps: false }
        );
    }

    // A move changes what the villagers inside are asked — they inherit
    // another place's questionnaire from their next request on — without
    // anything being published. So it is kept in the history like a publish,
    // under a version of its own: a response saved after it was asked
    // something else than one saved before.
    if (parent && villagesUnder(place._id, places).length > 0) {
        const moved = indexPlaces(await listPlaces()).get(String(place._id));
        const named = (id) => shown(byId.get(String(id)));
        await History.create({
            version: await Counters.nextVersion(),
            at: new Date(),
            actorId: res.locals.admin._id,
            actorName: res.locals.admin.name,
            placeId: place._id,
            placeNames: chainOf(moved).map(named),
            targetType: "place",
            targetId: place._id,
            label: { en: shown(place) },
            change: {
                kinds: ["place_moved"],
                counts: {},
                from: named(place.parentId),
                to: shown(parent),
            },
            before: { parentId: place.parentId },
            after: { parentId: parent._id },
        });
    }

    return res.json(await freshPlace(place._id));
};

module.exports.delete_place = async (req, res) => {
    const places = await listPlaces();
    const byId = indexPlaces(places);
    const { id } = req.params;
    // A village whose country matches nothing is in no tree (utils/places.js
    // buildPlaces leaves it out) but is still a row of the old Settings
    // page: it is found by its own document, and held to the same guards.
    const stray =
        typeof id === "string" &&
        /^[a-f0-9]{24}$/i.test(id) &&
        !byId.has(id.toLowerCase())
            ? await Villages.findById(id).select({ name: 1 }).lean()
            : null;
    const place = stray
        ? { _id: stray._id, kind: "village", level: "village", name: stray.name }
        : findPlace(byId, id);

    // Everything that would be left pointing at nothing. A response keeps the
    // village and the country it came from, never a region; a villager is
    // tied to a village by its name. Its questionnaire is its own work —
    // what it changed (drafts included), and the questions and categories it
    // added — and has to be undone in the editor first, not lost with it.
    const [team, responses, villagers, changes, ownQuestions, ownCategories] =
        await Promise.all([
            Admin.countDocuments({ role: "regional", placeId: place._id }),
            // What villagers there answered, and what its field officer
            // answered about it.
            place.kind === "region"
                ? 0
                : countAnswers(
                      place.kind === "village"
                          ? { villageId: place._id }
                          : { countryId: place._id }
                  ),
            place.kind === "village" ? villagersIn(place) : 0,
            PlaceOverrides.countDocuments({ placeId: place._id }),
            Questions.countDocuments({ ownerPlaceId: place._id }),
            Categories.countDocuments({ ownerPlaceId: place._id }),
        ]);

    const blockers = [
        [
            Math.max(subtreeIds(place._id, places).length - 1, 0),
            "place(s) inside it",
        ],
        [team, "team member(s)"],
        [responses, "response(s)"],
        [villagers, "registered villager(s)"],
        [changes, "change(s) to the questionnaire"],
        [ownQuestions, "question(s) of its own"],
        [ownCategories, "categor(ies) of its own"],
    ]
        .filter(([count]) => count > 0)
        .map(([count, what]) => `${count} ${what}`);

    if (blockers.length > 0) {
        const list = new Intl.ListFormat("en-GB", { type: "conjunction" });
        throw new AppError(
            0,
            `This ${levelName(place.level)} cannot be deleted while it has ${list.format(blockers)}.`,
            409
        );
    }

    await MODELS[place.kind].deleteOne({ _id: place._id });

    return res.json({ message: "Place deleted successfully" });
};
