const { ancestors } = require("./drafts");
const { pendingRows } = require("./changeSummary");
const { namingIds, listShape } = require("./questionTree");
const { inheritedView } = require("./liveQuestionnaire");
const { resolve } = require("./effectiveQuestionnaire");
const {
    indexPlaces,
    chainOf,
    villagesUnder,
    namesInside,
    shown,
} = require("./places");

/**
 * What the editor is sent, made from what the resolver worked out: the
 * shapes the dashboard is written against, for the Master and for a place.
 *
 * Nothing is read or written here — Controllers/questionnaire.js does the
 * reading and hands it over — so the payload can be checked without a
 * database: `node utils/editorPayload.js`.
 */

/** The part of a pending row the dashboard is given. */
const publicRow = (row) => ({
    key: row.key,
    items: row.items,
    placeId: row.placeId,
    placeNames: row.placeNames,
    targetType: row.targetType,
    label: row.label,
    summary: row.summary,
    dependsOn: row.dependsOn,
});

const byDepthThenOrder = (a, b) => a.depth - b.depth || a.order - b.order;
const byOrder = (a, b) => a.order - b.order;

/**
 * The categories and questions of one view — the Master's, or one place's —
 * as the editor is sent them: every field that reads the same in both. Each
 * comes back beside the resolver's document it was made from, for what only
 * one of the two adds.
 *
 * @param resolved what resolve() returned
 * @param answered Set of the ids of every answered question
 * @param mine     which of the resolver's documents belong in this view
 */
const editorLists = (resolved, answered, mine = () => true) => {
    const shownCategories = [...resolved.categories.values()].filter(mine);
    const shownQuestions = [...resolved.questions.values()].filter(mine);
    const questionById = new Map(
        shownQuestions.map((question) => [String(question._id), question])
    );

    /** A question and everything it sits in, itself first. */
    const upFrom = (question) => {
        const chain = [];
        const seen = new Set();
        let current = question;
        while (current && !seen.has(String(current._id))) {
            seen.add(String(current._id));
            chain.push(current);
            current = questionById.get(String(current.parentQuestionId));
        }
        return chain;
    };

    // A section is never answered itself; what is inside it is. Whether it
    // may be deleted is the same question either way, so an answer counts
    // for everything it sits in — which is what delete-question enforces.
    const answeredIds = new Set();
    shownQuestions.forEach((question) => {
        if (!answered.has(String(question._id))) return;
        upFrom(question).forEach((above) => answeredIds.add(String(above._id)));
    });

    // The page a question is drawn on is the page of what it sits in. The
    // two only differ while a place's question is waiting to move: the move
    // is drafted on that question alone, and what is inside it follows when
    // it is published (utils/drafts.js).
    const pageOf = (question) => {
        const chain = upFrom(question);
        return chain[chain.length - 1].categoryId;
    };

    // A question about to be deleted takes what is inside it along.
    const questionCount = new Map();
    shownQuestions.forEach((question) => {
        if (upFrom(question).some((above) => above.pendingDelete)) return;
        const page = String(pageOf(question));
        questionCount.set(page, (questionCount.get(page) || 0) + 1);
    });

    // Depth in the tree as it is DRAFTED: a category waiting to move is
    // already drawn where it is going.
    const parentOf = new Map(
        shownCategories.map((category) => [
            String(category._id),
            String(category.parentId || ""),
        ])
    );

    return {
        categories: shownCategories.map((category) => [
            category,
            {
                _id: category._id,
                title: category.title,
                description: category.description || {},
                parentId: category.parentId || null,
                is_screen: Boolean(category.is_screen),
                order: category.order || 0,
                active: category.active !== false,
                depth: ancestors(category._id, parentOf).length,
                ownerPlaceId: category.ownerPlaceId || null,
                unpublished: Boolean(category.unpublished),
                hasDraft: Boolean(category.hasDraft),
                rev: category.rev || 0,
                pendingArchive: category.pendingArchive,
                pendingDelete: category.pendingDelete,
                questionCount: questionCount.get(String(category._id)) || 0,
            },
        ]),
        questions: shownQuestions.map((question) => [
            question,
            {
                _id: question._id,
                categoryId: pageOf(question),
                parentQuestionId: question.parentQuestionId || null,
                label: question.label,
                helper_text: question.helper_text || {},
                type: question.type,
                // Every option, the archived ones too: the editor is where
                // they are brought back.
                options: question.allOptions.map(({ value, label, archived }) => ({
                    value,
                    label,
                    archived,
                })),
                required: Boolean(question.required),
                min: question.min ?? null,
                max: question.max ?? null,
                presentation: question.presentation || "inline",
                order: question.order || 0,
                active: question.active !== false,
                replacedBy: question.replacedBy || null,
                replaces: question.replaces || null,
                ownerPlaceId: question.ownerPlaceId || null,
                unpublished: Boolean(question.unpublished),
                hasDraft: Boolean(question.hasDraft),
                rev: question.rev || 0,
                answered: answeredIds.has(String(question._id)),
                pendingArchive: question.pendingArchive,
                pendingDelete: question.pendingDelete,
                replacedByPending: question.replacedByPending,
            },
        ]),
    };
};

/**
 * Where the Master's questions are NOT asked as the Master asks them, going
 * by what places have PUBLISHED: per question, the names of the places that
 * hide it, reword it or change its options, and how far the Master's own
 * wording still reaches ("This changes the Master").
 *
 * The place named is the one the override sits on; whatever is inside that
 * place follows it without being listed.
 *
 * A question is not asked where its own switch is off, and neither where
 * the place hides what it SITS IN: its page, a category above that, the
 * section or list it is a field of. `sitsIn(questionId)` names those (ids of
 * questions and categories); without it only the question's own switch
 * counts.
 *
 * @param overrides lean place_overrides documents with a published state,
 *                  about questions and (for `sitsIn`) about categories
 * @param places    listPlaces()
 * @param reach     `{ countries, villages }`: how many there are in all
 * @param sitsIn    (questionId) => ids of everything the question sits in
 * @returns (questionId) => that question's `usage`
 */
const masterUsage = (overrides, places, reach, sitsIn = () => []) => {
    const byId = indexPlaces(places);
    const position = new Map(
        places.map((place, index) => [String(place._id), index])
    );
    const none = () => ({ hidden: [], reworded: [], options: [], required: [] });

    // Keyed by what the override is about: a question, or a category (whose
    // state only ever holds `asked`).
    const perQuestion = new Map();
    overrides.forEach(({ placeId, targetId, published }) => {
        const place = byId.get(String(placeId));
        if (!place || !published) return;
        const key = String(targetId);
        if (!perQuestion.has(key)) perQuestion.set(key, none());
        const found = perQuestion.get(key);
        if (published.asked === false) found.hidden.push(place);
        if (published.label || published.helper_text) found.reworded.push(place);
        if (published.options || published.addedOptions) found.options.push(place);
        if (published.required !== undefined) found.required.push(place);
    });

    // In tree order, whatever order the overrides were read in.
    const names = (list) =>
        [...list]
            .sort(
                (a, b) =>
                    position.get(String(a._id)) - position.get(String(b._id))
            )
            .map(shown);

    return (questionId) => {
        const found = perQuestion.get(String(questionId)) || none();
        const hidden = [
            ...new Set([
                ...found.hidden,
                ...sitsIn(questionId).flatMap(
                    (id) => perQuestion.get(String(id))?.hidden || []
                ),
            ]),
        ];
        // A place with its own wording keeps it whatever the Master's is
        // changed to, and so does every village inside that place.
        const keeping = new Set(
            found.reworded.flatMap((place) =>
                villagesUnder(place._id, places).map(String)
            )
        );
        return {
            hiddenIn: names(hidden),
            rewordedIn: names(found.reworded),
            optionsChangedIn: names(found.options),
            requiredChangedIn: names(found.required),
            wording: {
                countries:
                    reach.countries -
                    found.reworded.filter((place) => place.kind === "country")
                        .length,
                villages: reach.villages - keeping.size,
                keptBy: names(found.reworded),
            },
        };
    };
};

/**
 * The one pill a row gets at a place — the first of hidden, added, changed,
 * options that applies, else as in the Master — and the place that made it
 * so. Read from the resolver's `from`, which names a place only where that
 * place really changed what it inherited.
 */
const statusAt = (doc, rank) => {
    const { from } = doc;
    // Wording set at two levels: the nearer place is the one to name.
    const nearest = (...ids) =>
        ids.filter(Boolean).sort((a, b) => rank.get(b) - rank.get(a))[0];

    // What the Master archived — itself, or anything it sits in — is not
    // "hidden" by anyone: it is not asked anywhere.
    if (doc.live && !doc.selfAsked && from.asked) {
        return ["hidden", from.asked];
    }
    if (doc.ownerPlaceId) return ["added", String(doc.ownerPlaceId)];
    if (from.label || from.helper_text || from.required) {
        return ["changed", nearest(from.label, from.helper_text, from.required)];
    }
    if (from.options) return ["options", from.options];
    return ["master", null];
};

/**
 * What each place on a chain did to the questionnaire, counted per place:
 * the numbers behind "1 hidden · 2 changed · 1 added". A place's entry is
 * what it set itself; the sum of the entries above it is what it inherits.
 * What the Master archived — a question, or the page or group it sits in —
 * is asked nowhere and counts for nobody (`live`, from the resolver).
 *
 * A place's editor (`compare`) and the overview of all places (placeDiffs)
 * both count with this, so the two cannot disagree.
 */
const tallyOf = (resolved, chain) => {
    const rank = new Map(chain.map((id, index) => [String(id), index]));
    const tally = new Map(
        chain.map((id) => [
            String(id),
            {
                hidden: 0,
                changed: 0,
                added: 0,
                categoriesHidden: 0,
                categoriesAdded: 0,
            },
        ])
    );
    const count = (at, what) => {
        const entry = tally.get(String(at));
        if (entry) entry[what] += 1;
    };
    const each = (docs, hidden, added, wording) =>
        docs.forEach((doc) => {
            if (!doc.live) return;
            const [kind, at] = statusAt(doc, rank);
            if (kind === "hidden") count(at, hidden);
            if (doc.ownerPlaceId) count(doc.ownerPlaceId, added);
            if (!wording) return;
            const { from } = doc;
            new Set(
                [
                    from.label,
                    from.helper_text,
                    from.required,
                    from.options,
                ].filter(Boolean)
            ).forEach((place) => count(place, "changed"));
        });
    each(resolved.categories, "categoriesHidden", "categoriesAdded", false);
    each(resolved.questions, "hidden", "added", true);
    return tally;
};

/** Whether a tally holds anything at all: questions or categories. */
const differs = ({ hidden, changed, added, categoriesHidden, categoriesAdded }) =>
    hidden + changed + added + categoriesHidden + categoriesAdded > 0;

/**
 * How every place differs from the Master, from PUBLISHED work only: the
 * overview of all places, and the Locations column. A Map of place id to
 *   null                      nothing on its chain differs;
 *   { sameAs }                it set nothing itself; `sameAs` names the
 *                             nearest place above that did;
 *   { notAsked, hidden, changed, added, own, base }
 *                             `own` is its own tally plus `shown`: what it
 *                             switched back ON that a place above hides (a
 *                             difference too, though no summary line counts
 *                             it). The three counts are its own plus what it
 *                             inherits, `base` names the nearest place above
 *                             with changes (or null) and `notAsked` is how
 *                             many live Master questions it is not asked —
 *                             every question of a hidden page included.
 *
 * Only a place that holds an override or owns something costs a run of the
 * resolver. `places` must be in tree order (listPlaces): each place is
 * judged after the ones above it.
 */
const placeDiffs = ({ places, categories, questions, overrides }) => {
    const candidates = new Set([
        ...overrides
            .filter((override) => Object.keys(override.published || {}).length > 0)
            .map((override) => String(override.placeId)),
        ...[...questions, ...categories]
            .filter((doc) => doc.ownerPlaceId && !doc.unpublished)
            .map((doc) => String(doc.ownerPlaceId)),
    ]);
    const byId = indexPlaces(places);
    const nameOf = (id) => shown(byId.get(String(id)));

    // What the Master itself asks: "not asked" is measured against that, so
    // what the Master asks nobody (anything under an archived page or group)
    // is not held against a place.
    const master = resolve({
        chain: [],
        categories,
        questions,
        overrides: [],
        drafts: new Set(),
    });
    const masterAsks = [...master.questions.values()]
        .filter((question) => question.asked)
        .map((question) => String(question._id));

    // Each resolver run is handed its own chain's overrides, not all of them.
    const overridesAt = new Map();
    overrides.forEach((override) => {
        const key = String(override.placeId);
        overridesAt.set(key, [...(overridesAt.get(key) || []), override]);
    });

    const worked = new Set();
    const out = new Map();
    places.forEach((place) => {
        const id = String(place._id);
        const above = place.path.map(String);

        if (candidates.has(id)) {
            const chain = chainOf(place);
            const resolved = resolve({
                chain,
                categories,
                questions,
                overrides: chain.flatMap(
                    (at) => overridesAt.get(String(at)) || []
                ),
                drafts: new Set(),
            });
            const tally = tallyOf(resolved, chain);
            const shownAgain = [
                ...resolved.categories.values(),
                ...resolved.questions.values(),
            ].filter(
                (doc) =>
                    doc.live && doc.selfAsked && String(doc.from.asked) === id
            ).length;
            const own = { ...tally.get(id), shown: shownAgain };
            // An override can have stopped changing anything (the place
            // above has since set the same): then it is not work of its own.
            if (Object.values(own).some((n) => n > 0)) {
                worked.add(id);
                const sum = (what) =>
                    above.reduce((total, at) => total + tally.get(at)[what], 0);
                const base = [...above]
                    .reverse()
                    .find((at) => differs(tally.get(at)));
                out.set(id, {
                    notAsked: masterAsks.filter(
                        (questionId) => !resolved.questions.get(questionId)?.asked
                    ).length,
                    hidden: own.hidden + sum("hidden"),
                    changed: own.changed + sum("changed"),
                    added: own.added + sum("added"),
                    own,
                    base: base ? nameOf(base) : null,
                });
                return;
            }
        }

        const nearest = [...above].reverse().find((at) => worked.has(at));
        out.set(id, nearest ? { sameAs: nameOf(nearest) } : null);
    });
    return out;
};

/**
 * Everything the editor draws for ONE place: what that place is asked, with
 * where each difference from the Master comes from, and what is waiting to
 * be published there and in the places inside it.
 *
 * @param view     what loadPlaceView() returned (with `subtree`, so that the
 *                 overrides of the places inside this one are there)
 * @param answered Set of the ids of every answered question
 * @param version  the questionnaire's version
 */
const placePayload = ({ view, answered, version }) => {
    const { place, places, chain, editable, drafts, resolved, overrides } = view;

    const byId = indexPlaces(places);
    const here = String(place._id);
    const nameOf = (id) => {
        const named = byId.get(String(id));
        return named ? shown(named) : null;
    };
    const rank = new Map(chain.map((id, index) => [String(id), index]));

    // What this place would be asked had it changed nothing itself, and
    // what it HAS changed, by target.
    const inherited = inheritedView(view);
    const own = new Map(
        overrides
            .filter((override) => String(override.placeId) === here)
            .map((override) => [String(override.targetId), override])
    );

    // The field that names each entry of a list (and the section holding
    // it): its switch is locked. See utils/questionTree.js namingIds.
    const byPage = new Map();
    resolved.questions.forEach((question) => {
        if (!question.selfAsked) return;
        const page = String(question.categoryId);
        byPage.set(page, [...(byPage.get(page) || []), question]);
    });
    const naming = new Set();
    byPage.forEach((questions) => {
        namingIds(questions).forEach((id) => naming.add(id));
    });

    // What each place on the chain did: `own` is this place's tally and
    // `inherited` the sum of the tallies above it.
    const tally = tallyOf(resolved, chain);
    const status = (doc) => {
        const [kind, at] = statusAt(doc, rank);
        return {
            kind,
            placeId: at,
            placeName: at && nameOf(at),
            here: at === here,
        };
    };
    // A draft is unfinished work: only its owner's managers are told of it.
    const hasDraft = (doc) =>
        Boolean(doc.hasDraft) && drafts.has(String(doc.ownerPlaceId));

    const lists = editorLists(resolved, answered);

    const categories = lists.categories
        .map(([category, sent]) => ({
            ...sent,
            hasDraft: hasDraft(category),
            asked: category.asked,
            status: status(category),
            // One list of entries, as the app draws it and as the server
            // places what is added to it (utils/questionTree.js listShape).
            list: Boolean(listShape(byPage.get(String(category._id)) || [])),
        }))
        .sort(byDepthThenOrder);

    const questions = lists.questions
        .map(([question, sent]) => {
            const above = inherited.questions.get(String(question._id));
            const override = own.get(String(question._id));
            return {
                ...sent,
                // Every option with its state here, not only those on offer.
                options: question.allOptions,
                hasDraft: hasDraft(question),
                inherited: {
                    label: above.label,
                    helper_text: above.helper_text || {},
                    // Whose wording that is: the place above that reworded
                    // it, or the place that added the question. The helper
                    // text can come from another place than the label.
                    fromName:
                        nameOf(above.from.label || question.ownerPlaceId) ||
                        "Master",
                    helperFromName:
                        nameOf(above.from.helper_text || question.ownerPlaceId) ||
                        "Master",
                    required: Boolean(above.required),
                    requiredFromName:
                        nameOf(above.from.required || question.ownerPlaceId) ||
                        "Master",
                },
                asked: question.selfAsked,
                status: status(question),
                // Everything set about it, each with the place that set it
                // (null: nobody did, it is the Master's): the one pill names
                // only the first, its tooltip lists them all.
                from: {
                    asked: question.from.asked || null,
                    label: question.from.label || null,
                    helper_text: question.from.helper_text || null,
                    required: question.from.required || null,
                    options: question.from.options || null,
                },
                own: override
                    ? {
                          rev: override.rev || 0,
                          hasDraft: Boolean(override.hasDraft),
                          state:
                              (override.hasDraft
                                  ? override.draft
                                  : override.published) || {},
                          // The options this place added that are out
                          // already: answers may sit on them, so the panel
                          // offers their switch and no "Remove".
                          publishedAdded: (
                              override.published?.addedOptions || []
                          ).map((option) => option.value),
                      }
                    : null,
                ...(naming.has(String(question._id))
                    ? { lockedSwitch: true }
                    : {}),
            };
        })
        .sort(byOrder);

    // The Publish count covers this place and everything inside it, each
    // row under its own place, named from here down.
    const inside = namesInside(place, places, place.depth);
    const position = new Map([...inside.keys()].map((id, index) => [id, index]));
    const pending = pendingRows({
        categories: view.categories,
        questions: view.questions,
        overrides,
        places: inside,
    })
        // What a place set about something this account is not shown yet —
        // the place above added it and has not published it — is not listed:
        // the row would show that unpublished wording, and could not go out
        // before its target anyway.
        .filter((row) => {
            if (!row.key.startsWith("override:")) return true;
            const target = (
                row.targetType === "question" ? view.questions : view.categories
            ).find((doc) => String(doc._id) === String(row.targetId));
            const owner = String(target?.ownerPlaceId || "");
            return !target?.unpublished || drafts.has(owner) || inside.has(owner);
        })
        .sort(
            (a, b) =>
                position.get(String(a.placeId)) - position.get(String(b.placeId))
        )
        .map(publicRow);

    const changedAbove = chain
        .slice(0, -1)
        .map(String)
        .filter((id) => differs(tally.get(id)));
    const sum = (what) =>
        changedAbove.reduce((total, id) => total + tally.get(id)[what], 0);

    const brief = (id) => ({
        name: nameOf(id),
        level: byId.get(String(id))?.level ?? null,
    });

    return {
        scope: {
            type: "place",
            placeId: place._id,
            name: shown(place),
            level: place.level,
            names: chain.map(nameOf),
            chain: chain.map((id) => ({ _id: id, ...brief(id) })),
            editable,
        },
        version,
        // How far a change made here reaches: this place's own villages.
        reach: {
            countries: place.kind === "country" ? 1 : 0,
            villages: villagesUnder(place._id, places).length,
        },
        compare: {
            baseName:
                changedAbove.length > 0
                    ? nameOf(changedAbove[changedAbove.length - 1])
                    : "the Master",
            own: tally.get(here),
            inherited:
                changedAbove.length > 0
                    ? {
                          names: changedAbove.map(nameOf),
                          hidden: sum("hidden"),
                          changed: sum("changed"),
                          added: sum("added"),
                          categoriesHidden: sum("categoriesHidden"),
                          categoriesAdded: sum("categoriesAdded"),
                      }
                    : null,
        },
        categories,
        questions,
        pending,
        // Every place the payload names: those above (a status, an option's
        // `addedBy`) and those below with something pending.
        places: Object.fromEntries(
            [
                ...new Set([
                    ...rank.keys(),
                    ...pending.map((row) => String(row.placeId)),
                ]),
            ].map((id) => [id, brief(id)])
        ),
    };
};

module.exports = {
    publicRow,
    byDepthThenOrder,
    byOrder,
    editorLists,
    masterUsage,
    tallyOf,
    placeDiffs,
    placePayload,
};

/* Self-check, no database: node utils/editorPayload.js */
if (require.main === module) {
    const assert = require("assert");
    const { resolve } = require("./effectiveQuestionnaire");
    const { buildPlaces, chainOf } = require("./places");

    const en = (text) => ({ en: text });
    const cat = (_id, extra = {}) => ({
        _id,
        title: en(_id),
        parentId: null,
        is_screen: true,
        order: 1,
        active: true,
        ...extra,
    });
    const q = (_id, categoryId, extra = {}) => ({
        _id,
        categoryId,
        parentQuestionId: null,
        label: en(_id),
        helper_text: {},
        type: "text",
        options: [],
        order: 1,
        active: true,
        ...extra,
    });
    const over = (_id, placeId, targetId, extra) => ({
        _id,
        placeId,
        targetType: "question",
        targetId,
        rev: 1,
        ...extra,
    });

    // India > Ladakh > Village 1, Village 2; Bhutan > Paro.
    const places = buildPlaces({
        countries: [
            { _id: "in", name: "india", display_name: "India" },
            { _id: "bt", name: "bhutan", display_name: "Bhutan" },
        ],
        regions: [
            { _id: "ladakh", name: "Ladakh", level: "state", countryId: "in", path: [] },
        ],
        villages: [
            { _id: "v1", name: "Village 1", countryId: "in", regionId: "ladakh" },
            { _id: "v2", name: "Village 2", countryId: "in", regionId: "ladakh" },
            { _id: "paro", name: "Paro", countryId: "bt" },
        ],
    });
    const placeById = indexPlaces(places);

    const categories = [
        cat("census", { order: 1 }),
        cat("food", { order: 2, is_screen: false }),
        cat("crops", { parentId: "food" }),
        cat("health", { order: 3 }),
        cat("ladakh-page", { order: 4, ownerPlaceId: "ladakh" }),
        cat("shelf", { order: 5, is_screen: false }),
        cat("shelf-page", { parentId: "shelf" }),
    ];
    const questions = [
        q("name", "census", { order: 1 }),
        q("age", "census", { order: 2, type: "number" }),
        q("marital", "census", {
            order: 3,
            type: "single_select",
            options: [
                { value: "a", label: en("A") },
                { value: "b", label: en("B") },
                { value: "old", label: en("Old"), archived: true },
            ],
        }),
        q("phone", "census", { order: 4 }),
        // Ladakh's own, published, with an edit of its own waiting.
        q("ladakh-q", "census", {
            order: 5,
            ownerPlaceId: "ladakh",
            rev: 3,
            hasDraft: true,
            draft: { required: true },
        }),
        // Village 1's own, not published yet.
        q("v1-q", "census", { order: 6, ownerPlaceId: "v1", unpublished: true }),
        q("retired", "census", { order: 7, active: false }),
        // The Master's unfinished work is no place's business.
        q("master-new", "census", { order: 8, unpublished: true }),
        q("master-edit", "census", {
            order: 9,
            hasDraft: true,
            draft: { label: en("Edited in the Master") },
        }),
        q("email", "census", { order: 10 }),
        // Not something the API lets happen (a place cannot archive), but
        // if it is in the data it must not be counted as asked anywhere.
        q("ladakh-old", "census", { order: 11, ownerPlaceId: "ladakh", active: false }),
        // Ladakh's published group, drafted to move to Ladakh's own page.
        // Its field still carries the old page until that is published.
        q("l-group", "census", {
            order: 12,
            ownerPlaceId: "ladakh",
            type: "repeatable_group",
            rev: 1,
            hasDraft: true,
            draft: { categoryId: "ladakh-page" },
        }),
        q("l-child", "census", { ownerPlaceId: "ladakh", parentQuestionId: "l-group" }),
        // Entries of crop, area, and a section holding `eaten` — and one
        // more top-level question, which India does not ask. So in India
        // the page is ONE list, and in Bhutan it is a form.
        q("entries", "crops", { type: "repeatable_group" }),
        q("crop", "crops", { parentQuestionId: "entries", order: 1 }),
        q("area", "crops", { parentQuestionId: "entries", order: 2 }),
        q("use", "crops", { parentQuestionId: "entries", order: 3, type: "section" }),
        q("eaten", "crops", { parentQuestionId: "use" }),
        q("notes", "crops", { order: 2 }),
        q("h1", "health"),
        q("on-page", "ladakh-page", { ownerPlaceId: "ladakh" }),
        q("s1", "shelf-page"),
    ];
    const overrides = [
        over("o1", "ladakh", "name", { published: { asked: false }, rev: 2 }),
        // Village 1 switches it back on: drafted, not published.
        over("o2", "v1", "name", { hasDraft: true, draft: { asked: true } }),
        over("o3", "ladakh", "age", { published: { label: en("Age in Ladakh") } }),
        over("o4", "ladakh", "marital", {
            published: {
                options: [{ value: "b", asked: false }],
                addedOptions: [{ value: "p_x", label: en("Only here") }],
            },
        }),
        over("o5", "in", "phone", { published: { helper_text: en("With country code") } }),
        over("o6", "ladakh", "phone", { hasDraft: true, draft: { label: en("Mobile") } }),
        { ...over("o7", "ladakh", "health", { published: { asked: false } }), targetType: "category" },
        // Reworded before the Master archived it: kept, but it counts nowhere.
        over("o8", "ladakh", "retired", { published: { label: en("Old one") } }),
        // Village 1 hides a whole group (a draft).
        { ...over("o9", "v1", "shelf", { hasDraft: true, draft: { asked: false } }), targetType: "category" },
        over("o10", "in", "notes", { published: { asked: false } }),
        // Label from India, helper text from Ladakh.
        over("o11", "in", "email", { published: { label: en("E-mail") } }),
        over("o12", "ladakh", "email", { published: { helper_text: en("If you have one") } }),
    ];

    // What loadPlaceView() hands over, without the reading. `editable` is
    // the part of the chain the account may change.
    const viewOf = (placeId, editable) => {
        const place = placeById.get(placeId);
        const chain = chainOf(place);
        const drafts = new Set(editable || chain);
        return {
            place,
            places,
            chain,
            editable: editable || chain,
            drafts,
            categories,
            questions,
            overrides,
            resolved: resolve({ chain, categories, questions, overrides, drafts }),
        };
    };
    const payload = (placeId, editable) =>
        placePayload({
            view: viewOf(placeId, editable),
            answered: new Set(["eaten", "age"]),
            version: 12,
        });
    const pick = (list, id) => list.find((entry) => entry._id === id);

    /* ---- Ladakh, opened by a super admin ---- */

    const ladakh = payload("ladakh");
    const lq = (id) => pick(ladakh.questions, id);
    const lc = (id) => pick(ladakh.categories, id);
    const here = (kind) => ({ kind, placeId: "ladakh", placeName: "Ladakh", here: true });
    const asMaster = { kind: "master", placeId: null, placeName: null, here: false };

    assert.deepStrictEqual(Object.keys(ladakh), [
        "scope",
        "version",
        "reach",
        "compare",
        "categories",
        "questions",
        "pending",
        "places",
    ]);
    assert.deepStrictEqual(ladakh.scope, {
        type: "place",
        placeId: "ladakh",
        name: "Ladakh",
        level: "state",
        names: ["India", "Ladakh"],
        chain: [
            { _id: "in", name: "India", level: "country" },
            { _id: "ladakh", name: "Ladakh", level: "state" },
        ],
        editable: ["in", "ladakh"],
    });
    assert.strictEqual(ladakh.version, 12);
    assert.deepStrictEqual(ladakh.reach, { countries: 0, villages: 2 });

    // Only what Ladakh's chain can see: not a village's own question, not
    // the Master's unpublished one — and the Master's waiting edit is
    // neither applied nor let on.
    assert.strictEqual(lq("v1-q"), undefined);
    assert.strictEqual(lq("master-new"), undefined);
    assert.deepStrictEqual(lq("master-edit").label, en("master-edit"));
    assert.strictEqual(lq("master-edit").hasDraft, false);
    // Its own waiting edit is both.
    assert.strictEqual(lq("ladakh-q").hasDraft, true);
    assert.strictEqual(lq("ladakh-q").required, true);
    assert.strictEqual(lq("ladakh-q").rev, 3);

    // One status each: the first that applies, and who made it so.
    assert.deepStrictEqual(lq("name").status, here("hidden"));
    assert.strictEqual(lq("name").asked, false);
    assert.deepStrictEqual(lq("age").status, here("changed"));
    assert.deepStrictEqual(lq("marital").status, here("options"));
    assert.deepStrictEqual(lq("ladakh-q").status, here("added"));
    assert.strictEqual(String(lq("ladakh-q").ownerPlaceId), "ladakh");
    assert.deepStrictEqual(lq("crop").status, asMaster);
    assert.strictEqual(lq("crop").asked, true);
    // Helper text from India, label (a draft) from Ladakh: the nearer one
    // is named — and so it is when it is the helper text that is nearer.
    assert.deepStrictEqual(lq("email").status, here("changed"));
    assert.deepStrictEqual(lq("email").label, en("E-mail"));
    assert.deepStrictEqual(lq("email").inherited, {
        label: en("E-mail"),
        helper_text: {},
        fromName: "India",
        helperFromName: "Master",
        required: false,
        requiredFromName: "Master",
    });
    // Hidden above: the same status, naming India, and not "here".
    assert.deepStrictEqual(lq("notes").status, {
        kind: "hidden",
        placeId: "in",
        placeName: "India",
        here: false,
    });
    assert.deepStrictEqual(lq("phone").status, here("changed"));
    assert.deepStrictEqual(lq("phone").label, en("Mobile"));
    assert.deepStrictEqual(lq("phone").helper_text, en("With country code"));
    // What it would read without Ladakh's own change, and whose that is.
    assert.deepStrictEqual(lq("phone").inherited, {
        label: en("phone"),
        helper_text: en("With country code"),
        // The label is the Master's; the helper text is India's.
        fromName: "Master",
        helperFromName: "India",
        required: false,
        requiredFromName: "Master",
    });
    assert.deepStrictEqual(lq("age").inherited, {
        label: en("age"),
        helper_text: {},
        fromName: "Master",
        helperFromName: "Master",
        required: false,
        requiredFromName: "Master",
    });
    // Its own override: the state the next patch is merged into.
    assert.deepStrictEqual(lq("name").own, {
        rev: 2,
        hasDraft: false,
        state: { asked: false },
        publishedAdded: [],
    });
    // The option Ladakh added is published: its switch, not "Remove".
    assert.deepStrictEqual(lq("marital").own.publishedAdded, ["p_x"]);
    // Where each part of a question comes from, the pill's tooltip.
    assert.deepStrictEqual(lq("name").from, {
        asked: "ladakh",
        label: null,
        helper_text: null,
        required: null,
        options: null,
    });
    assert.deepStrictEqual(lq("email").from, {
        asked: null,
        label: "in",
        helper_text: "ladakh",
        required: null,
        options: null,
    });
    assert.deepStrictEqual(lq("phone").own, {
        rev: 1,
        hasDraft: true,
        state: { label: en("Mobile") },
        publishedAdded: [],
    });
    assert.strictEqual(lq("crop").own, null);
    // Every option with its state here, archived and switched-off included.
    assert.deepStrictEqual(lq("marital").options, [
        { value: "a", label: en("A"), archived: false, asked: true, addedBy: null, hiddenBy: null },
        { value: "b", label: en("B"), archived: false, asked: false, addedBy: null, hiddenBy: "ladakh" },
        { value: "old", label: en("Old"), archived: true, asked: false, addedBy: null, hiddenBy: null },
        { value: "p_x", label: en("Only here"), archived: false, asked: true, addedBy: "ladakh", hiddenBy: null },
    ]);
    assert.strictEqual("usage" in lq("name"), false);
    // The field that names each entry of a list cannot be hidden, and
    // nothing else is locked. (Ladakh's own list is on its way to another
    // page, its field not yet: no page holds both, so nothing is locked
    // there until that move is published.)
    assert.strictEqual(lq("crop").lockedSwitch, true);
    assert.deepStrictEqual(
        ladakh.questions.filter((entry) => entry.lockedSwitch).map((entry) => entry._id),
        ["crop"]
    );
    assert.strictEqual("lockedSwitch" in lq("area"), false);
    // Answered counts for what it sits in, as in the Master's payload.
    assert.deepStrictEqual(
        ["eaten", "use", "entries", "crop"].map((id) => lq(id).answered),
        [true, true, true, false]
    );
    // Archived by the Master: still sent, as archived, and nobody's "hidden".
    assert.strictEqual(lq("retired").active, false);
    assert.strictEqual(lq("retired").asked, false);
    assert.strictEqual(lq("retired").status.kind, "changed");
    // Drafted to move: drawn on the page it is going to, with what is
    // inside it, although that still carries the old page.
    assert.strictEqual(lq("l-group").categoryId, "ladakh-page");
    assert.strictEqual(lq("l-child").categoryId, "ladakh-page");

    // Categories: `asked` is the effective one, the status its own.
    assert.deepStrictEqual(lc("health").status, here("hidden"));
    assert.strictEqual(lc("health").asked, false);
    assert.deepStrictEqual(lc("ladakh-page").status, here("added"));
    assert.deepStrictEqual(lc("crops").status, asMaster);
    assert.strictEqual(lc("crops").asked, true);
    assert.strictEqual(lc("crops").depth, 1);
    assert.strictEqual(lc("census").questionCount, 9);
    assert.strictEqual(lc("crops").questionCount, 6);
    assert.strictEqual(lc("ladakh-page").questionCount, 3);
    assert.deepStrictEqual(
        ladakh.categories.map((entry) => entry._id),
        ["census", "food", "health", "ladakh-page", "shelf", "crops", "shelf-page"]
    );

    // What Ladakh set itself, and what it takes over from India. `phone`
    // and `email` count for both: each of them changed something about
    // them. What is archived counts for nobody: not the Master's `retired`
    // (reworded here), not `ladakh-old` (added here).
    assert.deepStrictEqual(ladakh.compare, {
        baseName: "India",
        own: {
            hidden: 1,
            changed: 4,
            added: 4,
            categoriesHidden: 1,
            categoriesAdded: 1,
        },
        inherited: {
            names: ["India"],
            hidden: 1,
            changed: 2,
            added: 0,
            categoriesHidden: 0,
            categoriesAdded: 0,
        },
    });

    // Pending: Ladakh's own, then what the places inside it have waiting,
    // each named from Ladakh down.
    assert.deepStrictEqual(
        ladakh.pending.map((row) => [row.key, row.placeNames, row.summary]),
        [
            ["question:ladakh-q", ["Ladakh"], "required changed"],
            ["question:l-group", ["Ladakh"], "moved"],
            ["override:o6", ["Ladakh"], "wording changed"],
            ["question:v1-q", ["Ladakh", "Village 1"], "new question"],
            ["override:o2", ["Ladakh", "Village 1"], "shown"],
            ["override:o9", ["Ladakh", "Village 1"], "category hidden"],
        ]
    );
    assert.deepStrictEqual(ladakh.pending[2], {
        key: "override:o6",
        items: [{ type: "override", id: "o6", rev: 1 }],
        placeId: "ladakh",
        placeNames: ["Ladakh"],
        targetType: "question",
        label: en("Mobile"),
        summary: "wording changed",
        dependsOn: [],
    });
    assert.deepStrictEqual(ladakh.places, {
        in: { name: "India", level: "country" },
        ladakh: { name: "Ladakh", level: "state" },
        v1: { name: "Village 1", level: "village" },
    });

    /* ---- Village 1, which takes over Ladakh's changes ---- */

    const village = payload("v1");
    const vq = (id) => pick(village.questions, id);
    const fromLadakh = (kind) => ({
        kind,
        placeId: "ladakh",
        placeName: "Ladakh",
        here: false,
    });

    assert.deepStrictEqual(village.scope.names, ["India", "Ladakh", "Village 1"]);
    assert.deepStrictEqual(village.scope.editable, ["in", "ladakh", "v1"]);
    assert.deepStrictEqual(village.reach, { countries: 0, villages: 1 });
    // Set above: the same statuses, not "here".
    assert.deepStrictEqual(vq("age").status, fromLadakh("changed"));
    assert.deepStrictEqual(vq("marital").status, fromLadakh("options"));
    assert.deepStrictEqual(vq("ladakh-q").status, fromLadakh("added"));
    assert.deepStrictEqual(vq("age").inherited, {
        label: en("Age in Ladakh"),
        helper_text: {},
        fromName: "Ladakh",
        helperFromName: "Master",
        required: false,
        requiredFromName: "Master",
    });
    assert.strictEqual(vq("ladakh-q").inherited.fromName, "Ladakh");
    // Switched back on here (a draft): asked again, and as in the Master.
    assert.strictEqual(vq("name").asked, true);
    assert.deepStrictEqual(vq("name").status, asMaster);
    assert.deepStrictEqual(vq("name").own, {
        rev: 1,
        hasDraft: true,
        state: { asked: true },
        publishedAdded: [],
    });
    // Its own new question.
    assert.deepStrictEqual(vq("v1-q").status, {
        kind: "added",
        placeId: "v1",
        placeName: "Village 1",
        here: true,
    });
    assert.strictEqual(vq("v1-q").unpublished, true);
    // The page Ladakh hides is hidden here by Ladakh; its question's own
    // switch is still on.
    assert.deepStrictEqual(pick(village.categories, "health").status, fromLadakh("hidden"));
    assert.strictEqual(vq("h1").asked, true);
    // The group Village 1 hides takes its page along: the page's own
    // status is untouched, but it is not asked.
    assert.deepStrictEqual(pick(village.categories, "shelf").status, {
        kind: "hidden",
        placeId: "v1",
        placeName: "Village 1",
        here: true,
    });
    assert.deepStrictEqual(pick(village.categories, "shelf-page").status, asMaster);
    assert.strictEqual(pick(village.categories, "shelf-page").asked, false);
    assert.strictEqual(vq("s1").asked, true);
    assert.deepStrictEqual(village.compare, {
        baseName: "Ladakh",
        own: {
            hidden: 0,
            changed: 0,
            added: 1,
            categoriesHidden: 1,
            categoriesAdded: 0,
        },
        // `name` is not hidden here any more, so it is nobody's "hidden";
        // `notes` is India's.
        inherited: {
            names: ["India", "Ladakh"],
            hidden: 1,
            changed: 6,
            added: 4,
            categoriesHidden: 1,
            categoriesAdded: 1,
        },
    });
    // In Village 2, which changed nothing, Ladakh's hide is inherited too.
    assert.deepStrictEqual(payload("v2").compare.inherited, {
        names: ["India", "Ladakh"],
        hidden: 2,
        changed: 6,
        added: 4,
        categoriesHidden: 1,
        categoriesAdded: 1,
    });
    assert.deepStrictEqual(payload("v2").compare.own, {
        hidden: 0,
        changed: 0,
        added: 0,
        categoriesHidden: 0,
        categoriesAdded: 0,
    });
    // Only its own work is pending here, named from here.
    assert.deepStrictEqual(
        village.pending.map((row) => [row.key, row.placeNames]),
        [
            ["question:v1-q", ["Village 1"]],
            ["override:o2", ["Village 1"]],
            ["override:o9", ["Village 1"]],
        ]
    );

    /* ---- the same village, opened by an account that manages only it ---- */

    const regional = payload("v1", ["v1"]);
    const rq = (id) => pick(regional.questions, id);
    assert.deepStrictEqual(regional.scope.editable, ["v1"]);
    // Ladakh's unpublished work is not shown: its draft wording for `phone`
    // is not applied, so the change that counts there is India's …
    assert.deepStrictEqual(rq("phone").label, en("phone"));
    assert.deepStrictEqual(rq("phone").status, {
        kind: "changed",
        placeId: "in",
        placeName: "India",
        here: false,
    });
    // … and Ladakh's waiting edit of its own question is neither applied
    // nor let on. Its own draft still is.
    assert.strictEqual(rq("ladakh-q").hasDraft, false);
    assert.strictEqual(rq("ladakh-q").required, false);
    assert.strictEqual(rq("l-group").categoryId, "census");
    assert.strictEqual(rq("l-child").categoryId, "census");
    assert.strictEqual(rq("name").asked, true);

    /* ---- a place nobody changed anything for ---- */

    const paro = payload("paro");
    assert.deepStrictEqual(paro.compare, {
        baseName: "the Master",
        own: {
            hidden: 0,
            changed: 0,
            added: 0,
            categoriesHidden: 0,
            categoriesAdded: 0,
        },
        inherited: null,
    });
    assert.ok(paro.questions.every((entry) => entry.status.kind === "master"));
    assert.ok(paro.questions.every((entry) => entry.own === null));
    assert.strictEqual(pick(paro.questions, "ladakh-q"), undefined);
    assert.strictEqual(pick(paro.categories, "ladakh-page"), undefined);
    // `notes` is asked in Bhutan, so `crops` is a form there, not a list —
    // and the field naming its entries is locked all the same: the page is
    // a list again the day `notes` is hidden.
    assert.deepStrictEqual(
        paro.questions.filter((entry) => entry.lockedSwitch).map((entry) => entry._id),
        ["crop"]
    );
    assert.deepStrictEqual(paro.pending, []);
    assert.deepStrictEqual(Object.keys(paro.places), ["bt", "paro"]);

    /* ---- whether an answer is required, set by one place ---- */

    // Village 2 has changed nothing; then it alone turns "required" round.
    const plainAge = pick(payload("v2").questions, "age");
    const turned = over("o-req", "v2", "age", {
        published: { required: !plainAge.required },
    });
    const v2 = viewOf("v2");
    const strict = placePayload({
        view: {
            ...v2,
            overrides: [...overrides, turned],
            resolved: resolve({ ...v2, overrides: [...overrides, turned] }),
        },
        answered: new Set(),
        version: 12,
    });
    const strictAge = pick(strict.questions, "age");
    assert.strictEqual(strictAge.required, !plainAge.required);
    assert.strictEqual(strictAge.inherited.required, plainAge.required);
    assert.strictEqual(strictAge.inherited.requiredFromName, "Master");
    assert.strictEqual(strictAge.from.required, "v2");
    // It counts as a change made here, though the wording is Ladakh's.
    assert.deepStrictEqual(strictAge.status, {
        kind: "changed",
        placeId: "v2",
        placeName: "Village 2",
        here: true,
    });
    assert.strictEqual(strict.compare.own.changed, 1);
    assert.deepStrictEqual(
        masterUsage([turned], places, { countries: 2, villages: 3 })("age")
            .requiredChangedIn,
        ["Village 2"]
    );

    /* ---- the Master's side: where its questions are changed ---- */

    const reach = { countries: 2, villages: 3 };
    const usage = masterUsage(
        // As the editor reads them: questions, with something published.
        overrides.filter((o) => o.targetType === "question" && o.published),
        places,
        reach
    );
    const everywhere = { countries: 2, villages: 3, keptBy: [] };
    assert.deepStrictEqual(usage("name"), {
        hiddenIn: ["Ladakh"],
        rewordedIn: [],
        optionsChangedIn: [],
        requiredChangedIn: [],
        wording: everywhere,
    });
    assert.deepStrictEqual(usage("marital"), {
        hiddenIn: [],
        rewordedIn: [],
        optionsChangedIn: ["Ladakh"],
        requiredChangedIn: [],
        wording: everywhere,
    });
    // Ladakh keeps its own wording, and so do its two villages.
    assert.deepStrictEqual(usage("age"), {
        hiddenIn: [],
        rewordedIn: ["Ladakh"],
        optionsChangedIn: [],
        requiredChangedIn: [],
        wording: { countries: 2, villages: 1, keptBy: ["Ladakh"] },
    });
    // India keeps its own helper text: one country less, and only Paro left.
    assert.deepStrictEqual(usage("phone").wording, {
        countries: 1,
        villages: 1,
        keptBy: ["India"],
    });
    // India and, inside it, Ladakh: the same two villages, counted once.
    assert.deepStrictEqual(usage("email"), {
        hiddenIn: [],
        rewordedIn: ["India", "Ladakh"],
        optionsChangedIn: [],
        requiredChangedIn: [],
        wording: { countries: 1, villages: 1, keptBy: ["India", "Ladakh"] },
    });
    assert.deepStrictEqual(usage("notes").hiddenIn, ["India"]);
    // What Village 1 has only drafted is not usage yet; nor is anything
    // about a question nobody touched.
    assert.deepStrictEqual(usage("crop"), {
        hiddenIn: [],
        rewordedIn: [],
        optionsChangedIn: [],
        requiredChangedIn: [],
        wording: everywhere,
    });
    // A question is not asked where a place hides what it sits in: its
    // page (or a category above it), or the list it is a field of. Ladakh
    // hides the page "health"; India, here, the list of crops.
    const published = overrides.filter((o) => o.published);
    const sitsIn = (id) =>
        ({ crop: ["entries", "crops", "food"], pulse: ["health"] }[id] || []);
    const wider = masterUsage(
        [...published, over("x0", "in", "entries", { published: { asked: false } })],
        places,
        reach,
        sitsIn
    );
    assert.deepStrictEqual(wider("pulse").hiddenIn, ["Ladakh"]);
    assert.deepStrictEqual(wider("crop").hiddenIn, ["India"]);
    // Its own switch and its page's are one place, named once.
    assert.deepStrictEqual(
        masterUsage(
            [
                over("x4", "ladakh", "pulse", { published: { asked: false } }),
                ...published,
            ],
            places,
            reach,
            sitsIn
        )("pulse").hiddenIn,
        ["Ladakh"]
    );
    // Without it, as before: only the question's own switch counts.
    assert.deepStrictEqual(usage("pulse").hiddenIn, []);

    // Several places on one question are named in tree order (Bhutan's
    // Paro before India's Village 2), whatever order they were read in.
    assert.deepStrictEqual(
        masterUsage(
            [
                over("x1", "v2", "age", { published: { label: en("V2") } }),
                over("x2", "in", "age", { published: { asked: false } }),
                over("x3", "paro", "age", { published: { label: en("Paro") } }),
                // Switched back ON in Village 1: that is not "hidden in".
                over("x4", "v1", "age", { published: { asked: true } }),
            ],
            places,
            reach
        )("age"),
        {
            hiddenIn: ["India"],
            rewordedIn: ["Paro", "Village 2"],
            optionsChangedIn: [],
            requiredChangedIn: [],
            wording: { countries: 2, villages: 1, keptBy: ["Paro", "Village 2"] },
        }
    );

    /* ---- the Master's lists are what they were before places ---- */

    const master = resolve({
        categories,
        questions,
        overrides,
        drafts: new Set(["master"]),
    });
    const lists = editorLists(master, new Set(), (doc) => !doc.ownerPlaceId);
    const sent = (id) => lists.questions.find(([doc]) => doc._id === id)[1];
    assert.deepStrictEqual(
        lists.questions.map(([doc]) => doc._id).sort(),
        questions
            .filter((doc) => !doc.ownerPlaceId)
            .map((doc) => doc._id)
            .sort()
    );
    assert.strictEqual(sent("master-edit").hasDraft, true);
    assert.deepStrictEqual(sent("master-edit").label, en("Edited in the Master"));
    assert.strictEqual(sent("master-new").unpublished, true);
    // No place's wording, option or switch shows through.
    assert.deepStrictEqual(sent("age").label, en("age"));
    assert.strictEqual(sent("age").ownerPlaceId, null);
    assert.strictEqual(sent("crop").categoryId, "crops");
    assert.deepStrictEqual(sent("marital").options, [
        { value: "a", label: en("A"), archived: false },
        { value: "b", label: en("B"), archived: false },
        { value: "old", label: en("Old"), archived: true },
    ]);
    assert.deepStrictEqual(Object.keys(sent("age")), [
        "_id",
        "categoryId",
        "parentQuestionId",
        "label",
        "helper_text",
        "type",
        "options",
        "required",
        "min",
        "max",
        "presentation",
        "order",
        "active",
        "replacedBy",
        "replaces",
        "ownerPlaceId",
        "unpublished",
        "hasDraft",
        "rev",
        "answered",
        "pendingArchive",
        "pendingDelete",
        "replacedByPending",
    ]);

    /* ---- the overview of every place: published work only ---- */

    const diffs = placeDiffs({ places, categories, questions, overrides });
    assert.deepStrictEqual([...diffs.keys()], places.map((place) => place._id));
    // Nothing changed for Bhutan or in it; Village 2 set nothing itself.
    assert.strictEqual(diffs.get("bt"), null);
    assert.strictEqual(diffs.get("paro"), null);
    assert.deepStrictEqual(diffs.get("v2"), { sameAs: "Ladakh" });
    assert.strictEqual(diffs.get("in").base, null);
    assert.strictEqual(diffs.get("ladakh").base, "India");
    // `notes` (India), `name` and the whole `health` page (Ladakh).
    assert.strictEqual(diffs.get("in").notAsked, 1);
    assert.ok(diffs.get("ladakh").notAsked > 2);
    // Every place agrees with its own screen, opened with no drafts showing.
    places.forEach((place) => {
        const { compare } = payload(place._id, []);
        const diff = diffs.get(place._id);
        const worked = Object.values(compare.own).some((n) => n > 0);
        assert.strictEqual(Boolean(diff && diff.own), worked, place._id);
        if (!worked) return;
        assert.deepStrictEqual(diff.own, { ...compare.own, shown: 0 }, place._id);
        ["hidden", "changed", "added"].forEach((what) =>
            assert.strictEqual(
                diff[what],
                compare.own[what] + (compare.inherited?.[what] || 0),
                `${place._id} ${what}`
            )
        );
        assert.strictEqual(
            diff.base,
            compare.inherited ? compare.baseName : null,
            place._id
        );
    });
    // An override that has stopped changing anything is not work of its own.
    assert.deepStrictEqual(
        placeDiffs({
            places,
            categories,
            questions,
            overrides: [
                over("r1", "bt", "age", { published: { asked: false } }),
                over("r2", "paro", "age", { published: { asked: false } }),
            ],
        }).get("paro"),
        { sameAs: "Bhutan" }
    );
    // A village that only switches back on what its state hides differs
    // from it all the same: one question fewer is "not asked" there.
    const reshown = placeDiffs({
        places,
        categories: categories.filter((category) => !category.ownerPlaceId),
        questions: questions.filter((question) => !question.ownerPlaceId),
        overrides: [
            over("r3", "ladakh", "age", { published: { asked: false } }),
            over("r4", "v2", "age", { published: { asked: true } }),
        ],
    });
    assert.strictEqual(reshown.get("ladakh").notAsked, 1);
    assert.deepStrictEqual(reshown.get("v1"), { sameAs: "Ladakh" });
    assert.deepStrictEqual(reshown.get("v2"), {
        notAsked: 0,
        hidden: 0,
        changed: 0,
        added: 0,
        own: {
            hidden: 0,
            changed: 0,
            added: 0,
            categoriesHidden: 0,
            categoriesAdded: 0,
            shown: 1,
        },
        base: null,
    });

    // What the Master asks nobody is held against no place: a page archived
    // in the Master keeps its questions `active`, and they are neither "not
    // asked" in a place nor counted as that place's work.
    const fewCategories = [cat("live-page"), cat("old-page", { active: false })];
    const fewQuestions = [
        q("kept", "live-page"),
        q("gone-1", "old-page"),
        q("gone-2", "old-page"),
    ];
    const underArchived = placeDiffs({
        places,
        categories: fewCategories,
        questions: fewQuestions,
        overrides: [
            over("s1", "ladakh", "kept", { published: { label: en("Kept in Ladakh") } }),
            over("s2", "ladakh", "gone-1", { published: { asked: false } }),
        ],
    });
    assert.deepStrictEqual(underArchived.get("ladakh"), {
        notAsked: 0,
        hidden: 0,
        changed: 1,
        added: 0,
        own: {
            hidden: 0,
            changed: 1,
            added: 0,
            categoriesHidden: 0,
            categoriesAdded: 0,
            shown: 0,
        },
        base: null,
    });
    // A place whose only work is a hidden category differs all the same:
    // it is what the places inside it are compared with.
    const onlyCategory = placeDiffs({
        places,
        categories: fewCategories,
        questions: fewQuestions,
        overrides: [
            {
                ...over("s3", "ladakh", "live-page", { published: { asked: false } }),
                targetType: "category",
            },
            over("s4", "v1", "kept", { published: { label: en("In the village") } }),
        ],
    });
    assert.strictEqual(onlyCategory.get("ladakh").own.categoriesHidden, 1);
    assert.strictEqual(onlyCategory.get("ladakh").notAsked, 1);
    assert.strictEqual(onlyCategory.get("v1").base, "Ladakh");
    assert.deepStrictEqual(onlyCategory.get("v2"), { sameAs: "Ladakh" });

    console.log("editorPayload: all checks passed");
}
