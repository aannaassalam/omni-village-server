const Countries = require("../Models/countries");
const Regions = require("../Models/regions");
const Villages = require("../Models/villages");
const AppError = require("../AppError");

/**
 * A "place" is a country, a region (state, district, sub-district) or a
 * village. They are three collections because countries and villages are
 * older than regions and the app reads both as they are — and this is the
 * only file that knows it. Everything else works on the one flat list
 * listPlaces() returns and asks its questions here.
 *
 * What refers to a place stores that one id and nothing above it (an
 * account's placeId, a response's villageId). The places above are worked out
 * from the list at read time, so moving a place carries along whatever is
 * inside it and whatever points at it.
 */

/** Highest first. A place sits inside a place of a HIGHER level only. */
const LEVELS = ["country", "state", "district", "sub_district", "village"];

const same = (a, b) => String(a) === String(b);

/**
 * The three collections as one list in tree order: every place is followed by
 * what is inside it. Pure — listPlaces() does the reading — so the self-check
 * at the bottom needs no database.
 *
 * `path` is made of PLACE ids, root first, self excluded. A region stores only
 * the regions above it, so its country goes in front here.
 */
/**
 * A place's name as a person reads it. A village's `name` is stored in lower
 * case — it is the key a villager's `village_name` is matched on, and stays
 * that in this list — so it is given its capitals here, wherever a name is
 * written out for someone (breadcrumbs, pills, history).
 */
const shown = (place) =>
    place.level === "village"
        ? String(place.name || "").replace(/(^|\s)\S/g, (letter) =>
              letter.toUpperCase()
          )
        : place.name;

const buildPlaces = ({ countries, regions, villages }) => {
    const countryById = new Map(countries.map((c) => [String(c._id), c]));
    const countryByName = new Map(countries.map((c) => [c.name, c]));
    const regionById = new Map(regions.map((r) => [String(r._id), r]));
    const regionChain = (r) => [r.countryId, ...(r.path || [])];

    const place = (doc, kind, level, name, path) => ({
        _id: doc._id,
        kind,
        level,
        name,
        parentId: path.length > 0 ? path[path.length - 1] : null,
        path,
        depth: path.length,
        // A country is its own country, so "are these in the same country?"
        // is one comparison at every level.
        countryId: path.length > 0 ? path[0] : doc._id,
        // Villages older than this field have none: [] means "inherit".
        languages: doc.languages || [],
    });

    const flat = [
        ...countries.map((c) =>
            place(c, "country", "country", c.display_name || c.name, [])
        ),
        ...regions.map((r) =>
            place(r, "region", r.level, r.name, regionChain(r))
        ),
        ...villages.flatMap((v) => {
            const region = regionById.get(String(v.regionId));
            // No region: straight under its country. By id first; failing
            // that — a village older than countryId, or one copied from
            // another deployment whose id means nothing here — by the
            // `country` string, the join key everything older uses.
            const country =
                countryById.get(String(v.countryId)) ||
                countryByName.get(v.country);
            let path = null;
            if (region) path = [...regionChain(region), region._id];
            else if (country) path = [country._id];
            // A village whose country cannot be found either way has nowhere
            // to sit in the tree and is left out.
            return path ? [place(v, "village", "village", v.name, path)] : [];
        }),
    ];

    const childrenOf = new Map();
    flat.forEach((item) => {
        const key = String(item.parentId);
        childrenOf.set(key, [...(childrenOf.get(key) || []), item]);
    });

    const byName = (a, b) => a.name.localeCompare(b.name);
    const inside = (parent) =>
        (childrenOf.get(String(parent._id)) || [])
            .sort(
                (a, b) =>
                    LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) ||
                    byName(a, b)
            )
            .flatMap((child) => [child, ...inside(child)]);

    const orderOf = (item) => countryById.get(String(item._id)).order || 0;
    return flat
        .filter((item) => item.kind === "country")
        .sort((a, b) => orderOf(a) - orderOf(b) || byName(a, b))
        .flatMap((country) => [country, ...inside(country)]);
};

/**
 * Every place: `{_id, kind, level, name, parentId, path, depth, countryId,
 * languages}`.
 *
 * ponytail: reads the three collections whole on every call. Fine for the
 * hundreds of places there are; cache it (or select fewer fields) if villages
 * ever run to tens of thousands.
 */
const listPlaces = async () => {
    const [countries, regions, villages] = await Promise.all([
        Countries.find({}).lean(),
        Regions.find({}).lean(),
        Villages.find({}).lean(),
    ]);
    return buildPlaces({ countries, regions, villages });
};

const indexPlaces = (places) =>
    new Map(places.map((place) => [String(place._id), place]));

/** From the country down to the place itself. */
const chainOf = (place) => [...place.path, place._id];

const isUnder = (place, placeId) =>
    chainOf(place).some((id) => same(id, placeId));

/** The place and everything inside it. */
const subtreeIds = (placeId, places) =>
    places.filter((place) => isUnder(place, placeId)).map((place) => place._id);

/**
 * Every place inside `place`, itself included, each with the names that
 * lead to it: from the country down, or — with `skip` — from further in
 * (`place.depth` starts them at the place itself). A Map of id string to
 * names, in tree order.
 */
const namesInside = (place, places, skip = 0) => {
    const byId = indexPlaces(places);
    return new Map(
        subtreeIds(place._id, places).map((id) => [
            String(id),
            chainOf(byId.get(String(id)))
                .slice(skip)
                .map((above) => byId.get(String(above)))
                .filter(Boolean)
                .map(shown),
        ])
    );
};

/** The villages inside a place; a village is the only one inside itself. */
const villagesUnder = (placeId, places) =>
    places
        .filter((place) => place.kind === "village" && isUnder(place, placeId))
        .map((place) => place._id);

/**
 * The languages a place works in: everything named above it PLUS its own.
 * "+ Add language" on a state adds to its country's list; it must never
 * replace it, or the state would lose English, the stored fallback, the
 * moment it added one. `from` is the nearest place ABOVE that names any
 * (the "As India" wording), null for a country.
 */
const languagesFor = (place, byId) => {
    const above = place.path
        .map((id) => byId.get(String(id)))
        .filter((ancestor) => ancestor && ancestor.languages.length > 0);
    return {
        languages: [
            ...new Set([
                ...above.flatMap((ancestor) => ancestor.languages),
                ...place.languages,
            ]),
        ],
        from: above.length > 0 ? above[above.length - 1] : null,
    };
};

/**
 * What an account may touch: null is everything, and only an `admin` gets
 * that. Anyone else is held to their own place and what is inside it — so an
 * account with no place, or whose place has been deleted, can reach nothing.
 */
const scopeOf = (admin, places) => {
    if (admin.role === "admin") return null;
    const root = indexPlaces(places).get(String(admin.placeId));
    if (!root) {
        throw new AppError(0, "No place is assigned to this account.", 403);
    }
    return {
        rootId: root._id,
        ids: new Set(subtreeIds(root._id, places).map(String)),
    };
};

const assertInScope = (admin, placeId, places) => {
    const scope = scopeOf(admin, places);
    if (scope && !scope.ids.has(String(placeId))) {
        throw new AppError(0, "This place is not yours.", 403);
    }
};

/* ---- who may change which place's questionnaire ---- */

const MASTER_ONLY = "Only a super admin can change the Master.";

/**
 * `canEdit(placeId)` for one account: a super admin may change any place
 * that exists, a regional account its own place and what is inside it. Never
 * the places above it, although it reads what they changed.
 */
const canEditIn = (admin, places) => {
    const scope = scopeOf(admin, places);
    const byId = indexPlaces(places);
    return (placeId) =>
        byId.has(String(placeId)) &&
        (!scope || scope.ids.has(String(placeId)));
};

/** The place, or the refusal: not yours (403), or no such place (404). */
const assertCanEdit = (admin, placeId, places) => {
    if (canEditIn(admin, places)(placeId)) {
        return indexPlaces(places).get(String(placeId));
    }
    // Everything outside a regional account's place is "not yours", an id
    // that is no place at all included. Only a super admin gets this far.
    assertInScope(admin, placeId, places);
    throw new AppError(0, "Place not found", 404);
};

/** The Master is a super admin's alone. */
const assertMaster = (admin) => {
    if (admin.role !== "admin") throw new AppError(0, MASTER_ONLY, 403);
};

/**
 * For a write to a question, category or override that has been LOADED: its
 * own place decides who may change it (`ownerPlaceId`, or an override's
 * `placeId`), never a parameter of the request. No place is the Master.
 * `places` is read here unless the caller already has it.
 */
const assertCanChange = async (admin, ownerPlaceId, places) => {
    if (!ownerPlaceId) return assertMaster(admin);
    return assertCanEdit(admin, ownerPlaceId, places || (await listPlaces()));
};

/**
 * Whose PUBLISHED questions and categories an account may read, as owner
 * ids: null is everybody's (a super admin). A regional account reads the
 * Master's (the `null` in the list), what the places above it added — its
 * villagers are asked those — and what its own place and the places inside
 * it added.
 */
const readableOwners = async (admin) => {
    if (admin.role === "admin") return null;
    const places = await listPlaces();
    const root = indexPlaces(places).get(String(admin.placeId));
    // No place assigned, or the place is gone: it reads nothing.
    if (!root) {
        throw new AppError(0, "No place is assigned to this account.", 403);
    }
    return [null, ...root.path, ...subtreeIds(root._id, places)];
};

/**
 * The chain for ONE village, root first — what the app's requests need. Two
 * small reads at most, where listPlaces() would load every place on every
 * call.
 *
 * By the same rule buildPlaces() puts a village in the tree, so the app and
 * the dashboard cannot place it differently: under its region when it has
 * one (the region knows its country), else under its own country — by id,
 * and failing that by its `country` name. A village that is in no country
 * is in no tree, and is its own whole chain.
 */
const villageChain = async (village) => {
    const region = village.regionId
        ? await Regions.findById(village.regionId)
              .select({ path: 1, countryId: 1 })
              .lean()
        : null;
    if (region) {
        return [region.countryId, ...(region.path || []), region._id, village._id];
    }
    const only = { _id: 1 };
    const country =
        (village.countryId &&
            (await Countries.findById(village.countryId).select(only).lean())) ||
        (village.country &&
            (await Countries.findOne({
                name: String(village.country).toLowerCase(),
            })
                .select(only)
                .lean()));
    return country ? [country._id, village._id] : [village._id];
};

/**
 * What a dashboard READ is held to: the place named, a regional account's
 * own when it names none, and nothing (`place: null`) for a super admin who
 * names none. A place outside the account's own is refused; so is an account
 * that has no place.
 *
 * `owners` is whose published questions and categories belong in that view:
 * the Master's (the `null`), those of the places above — a villager there is
 * asked them — and those of the place and the places inside it. null means
 * everybody's.
 */
const readScope = async (admin, placeParam) => {
    // From a query string: it may be an array or an object as easily as text.
    if (
        placeParam &&
        (typeof placeParam !== "string" || !/^[a-f0-9]{24}$/i.test(placeParam))
    ) {
        throw new AppError(0, '"place" must be a valid id', 400);
    }
    if (!placeParam && admin.role === "admin") {
        return { place: null, places: null, owners: null };
    }
    const places = await listPlaces();
    // Lower-cased: ids are compared as Mongo prints them.
    const placeId = placeParam
        ? placeParam.toLowerCase()
        : scopeOf(admin, places).rootId;
    // Before "not found": an account must not learn which ids exist outside
    // its own place.
    assertInScope(admin, placeId, places);
    const place = indexPlaces(places).get(String(placeId));
    if (!place) throw new AppError(0, "Place not found", 404);
    return {
        place,
        places,
        owners: [null, ...place.path, ...subtreeIds(place._id, places)],
    };
};

/**
 * Only the Master is ordered by hand. What a place adds is numbered from here
 * up, so it stays after everything the Master has beside it — including what
 * the Master adds later, which is numbered among the Master's own.
 */
const PLACE_ORDER_BASE = 1000000;

module.exports = {
    LEVELS,
    PLACE_ORDER_BASE,
    shown,
    buildPlaces,
    listPlaces,
    villageChain,
    indexPlaces,
    chainOf,
    subtreeIds,
    namesInside,
    villagesUnder,
    languagesFor,
    scopeOf,
    assertInScope,
    MASTER_ONLY,
    canEditIn,
    assertCanEdit,
    assertMaster,
    assertCanChange,
    readableOwners,
    readScope,
};

/* Self-check, no database: node utils/places.js */
if (require.main === module) {
    const assert = require("assert");
    const country = (_id, name, display_name, order, languages) => ({
        _id,
        name,
        display_name,
        order,
        languages,
    });
    // Every region here is in India; a region's name is its id.
    const region = (_id, level, parentId, path, languages) => ({
        _id,
        name: _id,
        level,
        countryId: "in",
        parentId,
        path,
        languages,
    });
    const village = (_id, countryName, countryId, regionId) => ({
        _id,
        name: _id,
        country: countryName,
        countryId,
        regionId,
    });

    // Deliberately out of order, and with the gaps real documents have.
    const raw = {
        countries: [
            // First by name but last by `order`, and no display_name.
            country("al", "albania", "", 1, ["en"]),
            country("in", "india", "India", 0, ["en", "hi"]),
            country("bt", "bhutan", "Bhutan", 0, ["en", "dz"]),
        ],
        regions: [
            region("nubra", "sub_district", "leh", ["ladakh", "leh"], []),
            region("leh", "district", "ladakh", ["ladakh"], ["en", "lbj"]),
            region("ladakh", "state", null, [], []),
            region("assam", "state", null, []),
        ],
        villages: [
            village("paro", "bhutan", "bt", null),
            village("diskit", "india", "in", "nubra"),
            // Older than countryId: only the `country` string places it.
            village("thimphu", "bhutan"),
            village("alchi", "india", "in", "ladakh"),
            village("agra", "india", "in"),
            village("lost", "atlantis"),
        ],
    };
    const places = buildPlaces(raw);
    const byId = indexPlaces(places);
    const at = (id) => byId.get(id);
    const ids = (list) => list.map((place) => place._id);

    // Tree order: countries by order then name; inside a place the higher
    // level first (a state before a village, whatever their names), then by
    // name; each place followed at once by what is inside it.
    assert.deepStrictEqual(ids(places), [
        "bt",
        "paro",
        "thimphu",
        "in",
        "assam",
        "ladakh",
        "leh",
        "nubra",
        "diskit",
        "alchi",
        "agra",
        "al",
    ]);
    assert.strictEqual(at("bt").name, "Bhutan");
    assert.strictEqual(at("al").name, "albania");
    assert.deepStrictEqual(at("in"), {
        _id: "in",
        kind: "country",
        level: "country",
        name: "India",
        parentId: null,
        path: [],
        depth: 0,
        countryId: "in",
        languages: ["en", "hi"],
    });
    assert.deepStrictEqual(at("leh"), {
        _id: "leh",
        kind: "region",
        level: "district",
        name: "leh",
        parentId: "ladakh",
        path: ["in", "ladakh"],
        depth: 2,
        countryId: "in",
        languages: ["en", "lbj"],
    });
    assert.strictEqual(at("ladakh").parentId, "in");

    // A village directly under a country, and one four levels down.
    assert.deepStrictEqual(at("paro"), {
        _id: "paro",
        kind: "village",
        level: "village",
        name: "paro",
        parentId: "bt",
        path: ["bt"],
        depth: 1,
        countryId: "bt",
        languages: [],
    });
    const chain = ["in", "ladakh", "leh", "nubra"];
    assert.deepStrictEqual(at("diskit").path, chain);
    assert.strictEqual(at("diskit").parentId, "nubra");
    assert.strictEqual(at("diskit").depth, 4);
    assert.deepStrictEqual(chainOf(at("diskit")), [...chain, "diskit"]);

    // No countryId: placed by its `country` string. No such country: left out.
    assert.deepStrictEqual(at("thimphu").path, ["bt"]);
    assert.strictEqual(at("thimphu").countryId, "bt");
    assert.strictEqual(byId.has("lost"), false);

    const ladakh = ["ladakh", "leh", "nubra", "diskit", "alchi"];
    assert.deepStrictEqual(subtreeIds("ladakh", places), ladakh);
    // The names that lead to each place inside Leh: from the country down
    // (what history keeps), or from Leh itself (what its Publish dialog
    // heads its rows with). Written for a person: the village — whose `name`
    // stays the lower-case key — gets its capital, the regions stay as typed.
    assert.strictEqual(at("diskit").name, "diskit");
    assert.strictEqual(shown({ level: "village", name: "hunder two" }), "Hunder Two");
    assert.deepStrictEqual(
        [...namesInside(at("leh"), places)],
        [
            ["leh", ["India", "ladakh", "leh"]],
            ["nubra", ["India", "ladakh", "leh", "nubra"]],
            ["diskit", ["India", "ladakh", "leh", "nubra", "Diskit"]],
        ]
    );
    assert.deepStrictEqual(
        [...namesInside(at("leh"), places, at("leh").depth)],
        [
            ["leh", ["leh"]],
            ["nubra", ["leh", "nubra"]],
            ["diskit", ["leh", "nubra", "Diskit"]],
        ]
    );
    const villagesIn = (id) => villagesUnder(id, places);
    assert.deepStrictEqual(villagesIn("ladakh"), ["diskit", "alchi"]);
    assert.deepStrictEqual(villagesIn("in"), ["diskit", "alchi", "agra"]);
    assert.deepStrictEqual(villagesIn("bt"), ["paro", "thimphu"]);
    assert.deepStrictEqual(villagesIn("diskit"), ["diskit"]);
    assert.deepStrictEqual(villagesIn("assam"), []);

    // Languages add up going down: Diskit gets India's and Leh's (past
    // Nubra, which names none); `from` is the NEAREST place above that names
    // any. Leh's own list adds to India's rather than replacing it.
    assert.deepStrictEqual(languagesFor(at("diskit"), byId), {
        languages: ["en", "hi", "lbj"],
        from: at("leh"),
    });
    assert.deepStrictEqual(languagesFor(at("alchi"), byId), {
        languages: ["en", "hi"],
        from: at("in"),
    });
    assert.strictEqual(languagesFor(at("assam"), byId).from, at("in"));
    assert.deepStrictEqual(languagesFor(at("leh"), byId), {
        languages: ["en", "hi", "lbj"],
        from: at("in"),
    });
    assert.strictEqual(languagesFor(at("in"), byId).from, null);

    const regional = { role: "regional", placeId: "ladakh" };
    const forbidden = (message) => (error) =>
        error instanceof AppError &&
        error.statusCode === 403 &&
        error.message === message;
    assert.strictEqual(scopeOf({ role: "admin" }, places), null);
    const scope = scopeOf(regional, places);
    assert.strictEqual(scope.rootId, "ladakh");
    assert.deepStrictEqual([...scope.ids], ladakh);
    assert.doesNotThrow(() => assertInScope(regional, "diskit", places));
    assert.doesNotThrow(() => assertInScope({ role: "admin" }, "paro", places));
    // The country above it, a sibling state, a village outside it, another
    // country's village, and an id that is no place at all.
    ["in", "assam", "agra", "paro", "nowhere"].forEach((id) =>
        assert.throws(
            () => assertInScope(regional, id, places),
            forbidden("This place is not yours.")
        )
    );
    // No place, a deleted place, a role that is not admin: nothing at all.
    [
        { role: "regional", placeId: null },
        { role: "regional", placeId: "gone" },
        { role: "viewer" },
    ].forEach((account) =>
        assert.throws(
            () => scopeOf(account, places),
            forbidden("No place is assigned to this account.")
        )
    );

    // Who may change a place's questionnaire. A super admin: any place that
    // exists. A regional account: its own place and what is inside it — not
    // the country above it, whose changes it only reads.
    const admin = { role: "admin" };
    const notFound = (error) =>
        error instanceof AppError && error.statusCode === 404;
    assert.deepStrictEqual(
        ["in", "diskit", "nowhere"].map(canEditIn(admin, places)),
        [true, true, false]
    );
    assert.deepStrictEqual(
        ["in", "ladakh", "leh", "diskit", "assam", "paro", "nowhere"].map(
            canEditIn(regional, places)
        ),
        [false, true, true, true, false, false, false]
    );
    assert.strictEqual(assertCanEdit(regional, "diskit", places), at("diskit"));
    assert.strictEqual(assertCanEdit(admin, "paro", places), at("paro"));
    // Outside its place is "not yours" whether or not the place exists; only
    // a super admin is told that it does not.
    ["in", "agra", "nowhere"].forEach((id) =>
        assert.throws(
            () => assertCanEdit(regional, id, places),
            forbidden("This place is not yours.")
        )
    );
    assert.throws(() => assertCanEdit(admin, "nowhere", places), notFound);
    assert.doesNotThrow(() => assertMaster(admin));
    assert.throws(() => assertMaster(regional), forbidden(MASTER_ONLY));

    // In the database every id is an ObjectId, and two equal ObjectIds are
    // not ===. So the same tree once more with real ids, each one asked for
    // with a FRESH instance, as an id parsed from a request is.
    const { ObjectId } = require("mongoose").Types;
    const made = new Map();
    const oid = (name) => {
        if (!made.has(name)) made.set(name, new ObjectId());
        return new ObjectId(String(made.get(name)));
    };
    const real = (doc) => ({
        ...doc,
        _id: oid(doc._id),
        ...(doc.countryId && { countryId: oid(doc.countryId) }),
        ...(doc.parentId && { parentId: oid(doc.parentId) }),
        ...(doc.regionId && { regionId: oid(doc.regionId) }),
        ...(doc.path && { path: doc.path.map(oid) }),
    });
    const realPlaces = buildPlaces({
        countries: raw.countries.map(real),
        regions: raw.regions.map(real),
        villages: raw.villages.map(real),
    });
    const hex = (names) => names.map((name) => String(oid(name)));
    const asHex = (list) => list.map(String);
    assert.deepStrictEqual(asHex(ids(realPlaces)), hex(ids(places)));
    assert.deepStrictEqual(
        asHex(subtreeIds(oid("ladakh"), realPlaces)),
        hex(ladakh)
    );
    assert.deepStrictEqual(
        asHex(villagesUnder(oid("in"), realPlaces)),
        hex(villagesIn("in"))
    );
    const realById = indexPlaces(realPlaces);
    const diskit = realById.get(String(oid("diskit")));
    assert.deepStrictEqual(asHex(diskit.path), hex(chain));
    assert.strictEqual(
        String(languagesFor(diskit, realById).from._id),
        String(oid("leh"))
    );
    const realRegional = { role: "regional", placeId: oid("ladakh") };
    assert.deepStrictEqual(
        [...scopeOf(realRegional, realPlaces).ids],
        hex(ladakh)
    );
    assert.doesNotThrow(() =>
        assertInScope(realRegional, oid("diskit"), realPlaces)
    );
    assert.throws(
        () => assertInScope(realRegional, oid("agra"), realPlaces),
        forbidden("This place is not yours.")
    );
    assert.deepStrictEqual(
        ["diskit", "in"].map((name) =>
            canEditIn(realRegional, realPlaces)(oid(name))
        ),
        [true, false]
    );

    // A loaded document is judged by its own place; one with none is the
    // Master's. (The places are handed in, so nothing is read here.)
    Promise.all([
        assertCanChange(admin, null, places),
        assertCanChange(regional, "leh", places).then((place) =>
            assert.strictEqual(place, at("leh"))
        ),
        assert.rejects(
            assertCanChange(regional, null, places),
            forbidden(MASTER_ONLY)
        ),
        assert.rejects(
            assertCanChange(regional, "in", places),
            forbidden("This place is not yours.")
        ),
    ]).then(
        () => console.log("places: all checks passed"),
        (error) => {
            console.error(error);
            process.exit(1);
        }
    );
}
