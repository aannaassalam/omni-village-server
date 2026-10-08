const { isDeepStrictEqual } = require("util");

/**
 * What a place is asked.
 *
 * The Master questionnaire is what every place starts with. A place (country,
 * state, district, sub-district or village) may then switch a question or a
 * category off, reword a question, switch options off, and add options,
 * questions and categories of its own; whatever it does not touch it takes
 * from the level above. This is the ONE place that rule lives: the mobile app's
 * three endpoints and the dashboard editor both read through it, so they
 * cannot disagree about what "asked in Ladakh" means.
 *
 * Pure on purpose: it is handed documents and returns Maps, so it can be
 * checked without a database (`node utils/effectiveQuestionnaire.js`).
 */
const str = (id) => (id === null || id === undefined ? "" : String(id));

// The two types that are asked through what they hold, never by themselves.
const CONTAINERS = ["section", "repeatable_group"];

/** `{}`, null and undefined all mean "no wording here". */
const wording = (value) =>
    value === null ||
    value === undefined ||
    (typeof value === "object" && Object.keys(value).length === 0)
        ? null
        : value;

const sameValue = (a, b) => isDeepStrictEqual(wording(a), wording(b));

/**
 * @param chain      place ids, root first (country … village). [] is the
 *                   Master itself.
 * @param categories lean documents, any state
 * @param questions  lean documents, any state
 * @param overrides  lean place_overrides documents; those of places outside
 *                   the chain are ignored
 * @param drafts     Set of "master" and/or place-id strings whose unpublished
 *                   work applies. Empty for the mobile app.
 * @returns {{categories: Map, questions: Map}} keyed by id string, holding
 *          only what this chain can see
 */
const resolve = ({
    chain = [],
    categories = [],
    questions = [],
    overrides = [],
    drafts = new Set(),
}) => {
    const places = chain.map(str);
    const inChain = new Set(places);

    const covered = (owner) => drafts.has(owner ? str(owner) : "master");

    // A draft on a published document is a patch; applied only for a viewer
    // who is entitled to see that owner's unpublished work.
    const view = (doc) =>
        covered(doc.ownerPlaceId) && doc.hasDraft && doc.draft
            ? { ...doc, ...doc.draft }
            : doc;

    const ownKept = (doc) =>
        (!doc.ownerPlaceId || inChain.has(str(doc.ownerPlaceId))) &&
        (!doc.unpublished || covered(doc.ownerPlaceId));

    const overridesOf = new Map();
    overrides.forEach((override) => {
        if (!inChain.has(str(override.placeId))) return;
        const key = str(override.targetId);
        if (!overridesOf.has(key)) overridesOf.set(key, new Map());
        overridesOf.get(key).set(str(override.placeId), override);
    });

    /**
     * Walks the chain root to leaf over one target. A level is written to
     * `from` ONLY when it changes what it would have inherited, so "an
     * override document exists" never reads as "this place differs".
     */
    const fold = (id, start, properties) => {
        const current = start;
        const from = {};
        const forTarget = overridesOf.get(id);
        if (!forTarget) return { current, from };

        places.forEach((place) => {
            const override = forTarget.get(place);
            if (!override) return;
            const state =
                covered(override.placeId) && override.hasDraft
                    ? override.draft
                    : override.published;
            if (!state) return;

            properties.forEach((property) => {
                if (
                    state[property] !== undefined &&
                    !sameValue(state[property], current[property])
                ) {
                    current[property] = state[property];
                    from[property] = place;
                }
            });

            if (!current.options) return;

            (state.addedOptions || []).forEach((added) => {
                if (current.options.some((o) => o.value === added.value)) return;
                current.options.push({
                    value: added.value,
                    label: added.label,
                    archived: Boolean(added.archived),
                    asked: !added.archived,
                    addedBy: place,
                    hiddenBy: null,
                });
                current.known.add(String(added.value));
                from.options = place;
            });

            (state.options || []).forEach(({ value, asked }) => {
                const option = current.options.find((o) => o.value === value);
                if (!option || option.archived || option.asked === asked) return;
                option.asked = asked;
                option.hiddenBy = asked ? null : place;
                from.options = place;
            });
        });

        return { current, from };
    };

    /* ---------------- which documents this chain can see ---------------- */

    const categoryDocs = new Map(categories.map((c) => [str(c._id), c]));
    const keptCategory = new Map();
    const isCategoryKept = (id, trail = new Set()) => {
        if (keptCategory.has(id)) return keptCategory.get(id);
        const doc = categoryDocs.get(id);
        let kept = Boolean(doc) && ownKept(doc) && !trail.has(id);
        if (kept) {
            const parent = str(view(doc).parentId);
            if (parent) kept = isCategoryKept(parent, new Set(trail).add(id));
        }
        keptCategory.set(id, kept);
        return kept;
    };

    const questionDocs = new Map(questions.map((q) => [str(q._id), q]));
    const keptQuestion = new Map();
    const isQuestionKept = (id, trail = new Set()) => {
        if (keptQuestion.has(id)) return keptQuestion.get(id);
        const doc = questionDocs.get(id);
        let kept =
            Boolean(doc) &&
            ownKept(doc) &&
            !trail.has(id) &&
            isCategoryKept(str(view(doc).categoryId));
        if (kept && doc.parentQuestionId) {
            kept = isQuestionKept(
                str(doc.parentQuestionId),
                new Set(trail).add(id)
            );
        }
        keptQuestion.set(id, kept);
        return kept;
    };

    // A replacement that is still a draft retires the question it replaces,
    // for whoever can see that draft.
    const replacedByDraft = new Set();
    questions.forEach((question) => {
        if (
            question.unpublished &&
            question.replaces &&
            isQuestionKept(str(question._id))
        ) {
            replacedByDraft.add(str(question.replaces));
        }
    });

    /* ---------------- categories ---------------- */

    const outCategories = new Map();
    categories.forEach((doc) => {
        const id = str(doc._id);
        if (!isCategoryKept(id)) return;
        const seen = view(doc);
        const { current, from } = fold(id, { asked: true }, ["asked"]);
        const pendingDelete = seen.deleted === true;
        outCategories.set(id, {
            ...seen,
            asked: false,
            // The Master's archive beats any place's `asked: true`.
            selfAsked: seen.active !== false && !pendingDelete && current.asked,
            from,
            pendingDelete,
            pendingArchive: doc.active !== false && seen.active === false,
        });
    });

    const categoryAsked = new Map();
    const isCategoryAsked = (id) => {
        if (categoryAsked.has(id)) return categoryAsked.get(id);
        categoryAsked.set(id, false); // a cycle resolves to "not asked"
        const category = outCategories.get(id);
        const parent = category && str(category.parentId);
        const asked =
            Boolean(category) &&
            category.selfAsked &&
            (!parent || isCategoryAsked(parent));
        categoryAsked.set(id, asked);
        return asked;
    };
    outCategories.forEach((category, id) => {
        category.asked = isCategoryAsked(id);
    });

    // "Live": neither archived itself nor sitting in anything archived.
    // Archiving a page or a group writes that one document only — what is
    // under it keeps `active: true` — so "is this still part of the
    // questionnaire at all?" has to look up the tree. What is not live is
    // asked nowhere, by anyone, and counts for no place.
    const liveMemo = new Map();
    const isLive = (kind, id) => {
        const key = `${kind}:${id}`;
        if (liveMemo.has(key)) return liveMemo.get(key);
        liveMemo.set(key, false); // a cycle is not live
        const doc = (kind === "category" ? outCategories : outQuestions).get(id);
        const above =
            kind === "category"
                ? [["category", str(doc?.parentId)]]
                : [
                      ["category", str(doc?.categoryId)],
                      ["question", str(doc?.parentQuestionId)],
                  ];
        const live =
            Boolean(doc) &&
            doc.active !== false &&
            above.every(([type, parent]) => !parent || isLive(type, parent));
        liveMemo.set(key, live);
        return live;
    };

    /* ---------------- questions ---------------- */

    const outQuestions = new Map();
    questions.forEach((doc) => {
        const id = str(doc._id);
        if (!isQuestionKept(id)) return;
        const seen = view(doc);
        const { current, from } = fold(
            id,
            {
                asked: true,
                label: seen.label,
                helper_text: seen.helper_text,
                // Fresh objects: the input documents are never mutated.
                options: (seen.options || []).map((option) => ({
                    value: option.value,
                    label: option.label,
                    archived: Boolean(option.archived),
                    asked: !option.archived,
                    addedBy: null,
                    hiddenBy: null,
                })),
                known: new Set(
                    (seen.options || []).map((option) => String(option.value))
                ),
            },
            ["asked", "label", "helper_text"]
        );
        const pendingDelete = seen.deleted === true;
        const replacedByPending = replacedByDraft.has(id);
        outQuestions.set(id, {
            ...seen,
            label: current.label,
            helper_text: current.helper_text,
            asked: false,
            selfAsked:
                seen.active !== false &&
                !pendingDelete &&
                !replacedByPending &&
                current.asked,
            from,
            pendingDelete,
            pendingArchive: doc.active !== false && seen.active === false,
            replacedByPending,
            // What the app shows …
            options: current.options
                .filter((option) => option.asked && !option.archived)
                .map((option) => ({
                    value: option.value,
                    label: option.label,
                    ...(option.addedBy ? { addedBy: option.addedBy } : {}),
                })),
            // … every option with its state, for the editor …
            allOptions: current.options,
            // … and every key that was ever valid here, for accepting an
            // answer saved before an option was switched off.
            knownValues: current.known,
        });
    });

    const questionAsked = new Map();
    const isQuestionAsked = (id) => {
        if (questionAsked.has(id)) return questionAsked.get(id);
        questionAsked.set(id, false);
        const question = outQuestions.get(id);
        const parent = question && str(question.parentQuestionId);
        // A place's `asked: true` on one question does not pierce a hidden
        // page or a hidden group: both must be asked as well.
        const asked =
            Boolean(question) &&
            question.selfAsked &&
            isCategoryAsked(str(question.categoryId)) &&
            (!parent || isQuestionAsked(parent));
        questionAsked.set(id, asked);
        return asked;
    };
    outQuestions.forEach((question, id) => {
        question.asked = isQuestionAsked(id);
    });

    // A section or a list with nothing asked inside it has nothing to ask:
    // the app would draw an empty accordion, or entries without a field. It
    // is asked only while something answerable under it is — worked out from
    // the bottom up, since a list can hold a section that holds the fields.
    // Its own switch (`selfAsked`) is left alone: the editor still shows it
    // on, and switching a field back on brings the section back with it.
    const inside = new Map();
    outQuestions.forEach((question, id) => {
        const parent = str(question.parentQuestionId);
        if (parent) inside.set(parent, [...(inside.get(parent) || []), id]);
    });
    const holds = new Map();
    const holdsSomething = (id) => {
        if (holds.has(id)) return holds.get(id);
        holds.set(id, false);
        const question = outQuestions.get(id);
        const answerable =
            question.asked &&
            (!CONTAINERS.includes(question.type) ||
                (inside.get(id) || []).some(holdsSomething));
        holds.set(id, answerable);
        return answerable;
    };
    outQuestions.forEach((question, id) => {
        question.asked = holdsSomething(id);
    });

    outCategories.forEach((category, id) => {
        category.live = isLive("category", id);
    });
    outQuestions.forEach((question, id) => {
        question.live = isLive("question", id);
    });

    return { categories: outCategories, questions: outQuestions };
};

/**
 * The categories the app lists: a question page that is asked and has at
 * least one asked question, and every group above such a page. A page with
 * nothing left to ask, and a group with no page left, are therefore absent.
 */
const visibleCategoryIds = ({ categories, questions }) => {
    const pagesWithQuestions = new Set();
    questions.forEach((question) => {
        if (question.asked) pagesWithQuestions.add(str(question.categoryId));
    });

    const visible = new Set();
    categories.forEach((category, id) => {
        if (!category.asked || !category.is_screen) return;
        if (!pagesWithQuestions.has(id)) return;
        // An asked page has only asked ancestors, so they can be added as is.
        let current = id;
        while (current && !visible.has(current)) {
            visible.add(current);
            current = str(categories.get(current)?.parentId);
        }
    });
    return visible;
};

/** Ids of every asked question of one page, all depths. */
const askedQuestionIds = ({ questions }, categoryId) => {
    const ids = [];
    questions.forEach((question, id) => {
        if (question.asked && str(question.categoryId) === str(categoryId)) {
            ids.push(id);
        }
    });
    return ids;
};

module.exports = { resolve, visibleCategoryIds, askedQuestionIds };

/* Self-check: node utils/effectiveQuestionnaire.js */
if (require.main === module) {
    const assert = require("assert");
    const mongoose = require("mongoose");

    const en = (text) => ({ en: text });
    const cat = (_id, extra = {}) => ({
        _id,
        title: en(_id),
        parentId: null,
        is_screen: true,
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
        active: true,
        ...extra,
    });
    const over = (placeId, targetId, published, extra = {}) => ({
        placeId,
        targetType: "question",
        targetId,
        published,
        ...extra,
    });
    const opts = (...values) =>
        values.map((value) => ({ value, label: en(value.toUpperCase()) }));

    const categories = [
        cat("food", { is_screen: false }),
        cat("crops", { parentId: "food" }),
        cat("census"),
        cat("empty"),
        cat("lonely-group", { is_screen: false }),
        cat("lonely-page", { parentId: "lonely-group" }),
    ];
    const questions = [
        q("marital", "census", {
            type: "single_select",
            options: [...opts("a", "b"), { ...opts("old")[0], archived: true }],
        }),
        q("name", "census"),
        q("retired", "census", { active: false }),
        q("draft-new", "census", { unpublished: true }),
        q("entries", "crops", { type: "repeatable_group" }),
        q("crop", "crops", { parentQuestionId: "entries" }),
        q("use", "crops", { parentQuestionId: "entries", type: "section" }),
        q("eaten", "crops", { parentQuestionId: "use" }),
        q("only-lonely", "lonely-page", { active: false }),
    ];
    const chain = ["in", "ladakh", "v1"];
    const other = ["in", "ladakh", "v2"];
    const run = (extra = {}) =>
        resolve({ chain, categories, questions, ...extra });
    const asked = (result, id) => result.questions.get(id)?.asked;

    /* ---- the Master alone ---- */
    const before = JSON.stringify({ categories, questions });
    const master = resolve({ chain: [], categories, questions });
    assert.strictEqual(asked(master, "marital"), true);
    assert.strictEqual(asked(master, "retired"), false);
    assert.strictEqual(master.questions.has("draft-new"), false);
    assert.strictEqual(
        resolve({
            chain: [],
            categories,
            questions,
            drafts: new Set(["master"]),
        }).questions.has("draft-new"),
        true
    );
    assert.deepStrictEqual(master.questions.get("marital").options, opts("a", "b"));
    assert.strictEqual(master.questions.get("marital").knownValues.has("old"), true);
    assert.strictEqual(
        master.questions.get("marital").allOptions.find((o) => o.value === "old")
            .asked,
        false
    );

    /* ---- a draft patch applies only to those who may see it ---- */
    const patched = questions.map((question) =>
        question._id === "name"
            ? { ...question, hasDraft: true, draft: { label: en("Full name") } }
            : question
    );
    assert.deepStrictEqual(
        resolve({ categories, questions: patched }).questions.get("name").label,
        en("name")
    );
    assert.deepStrictEqual(
        resolve({
            categories,
            questions: patched,
            drafts: new Set(["master"]),
        }).questions.get("name").label,
        en("Full name")
    );

    /* ---- pending archive, delete and replacement ---- */
    const pending = (draft, extra = []) =>
        resolve({
            categories,
            questions: [
                ...questions.map((question) =>
                    question._id === "name"
                        ? { ...question, hasDraft: true, draft }
                        : question
                ),
                ...extra,
            ],
            drafts: new Set(["master"]),
        }).questions.get("name");
    assert.strictEqual(pending({ active: false }).asked, false);
    assert.strictEqual(pending({ active: false }).pendingArchive, true);
    assert.strictEqual(pending({ deleted: true }).asked, false);
    assert.strictEqual(pending({ deleted: true }).pendingDelete, true);
    const replacement = q("name-v2", "census", {
        unpublished: true,
        replaces: "name",
    });
    const replaced = resolve({
        categories,
        questions: [...questions, replacement],
        drafts: new Set(["master"]),
    });
    assert.strictEqual(replaced.questions.get("name").replacedByPending, true);
    assert.strictEqual(asked(replaced, "name"), false);
    assert.strictEqual(asked(replaced, "name-v2"), true);
    // …and without the draft nothing has happened yet.
    assert.strictEqual(
        asked(resolve({ categories, questions: [...questions, replacement] }), "name"),
        true
    );

    /* ---- hidden at a state, shown again in one village ---- */
    const hidden = [
        over("ladakh", "name", { asked: false }),
        over("v1", "name", { asked: true }),
    ];
    const inV1 = run({ overrides: hidden });
    const inV2 = resolve({ chain: other, categories, questions, overrides: hidden });
    assert.strictEqual(asked(inV1, "name"), true);
    assert.strictEqual(inV1.questions.get("name").from.asked, "v1");
    assert.strictEqual(asked(inV2, "name"), false);
    assert.strictEqual(inV2.questions.get("name").from.asked, "ladakh");
    // A place outside the chain is ignored.
    assert.strictEqual(
        asked(
            resolve({ chain: ["my"], categories, questions, overrides: hidden }),
            "name"
        ),
        true
    );

    /* ---- reworded at two levels: the nearest wins ---- */
    const reworded = run({
        overrides: [
            over("in", "name", { label: en("Name (India)"), helper_text: en("As on ID") }),
            over("ladakh", "name", { label: en("Name (Ladakh)") }),
        ],
    }).questions.get("name");
    assert.deepStrictEqual(reworded.label, en("Name (Ladakh)"));
    assert.strictEqual(reworded.from.label, "ladakh");
    assert.deepStrictEqual(reworded.helper_text, en("As on ID"));
    assert.strictEqual(reworded.from.helper_text, "in");

    /* ---- an override that repeats what it inherits changes nothing ---- */
    const idle = run({
        overrides: [
            over("ladakh", "name", { asked: true, label: en("name"), helper_text: {} }),
        ],
    }).questions.get("name");
    assert.deepStrictEqual(idle.from, {});

    /* ---- a place's draft applies only when that place is covered ---- */
    const drafted = [
        over("ladakh", "name", { asked: true }, { hasDraft: true, draft: { asked: false } }),
    ];
    assert.strictEqual(asked(run({ overrides: drafted }), "name"), true);
    assert.strictEqual(
        asked(run({ overrides: drafted, drafts: new Set(["ladakh"]) }), "name"),
        false
    );
    assert.strictEqual(
        asked(run({ overrides: drafted, drafts: new Set(["master"]) }), "name"),
        true
    );

    /* ---- options ---- */
    const optionOverrides = [
        over("ladakh", "marital", {
            options: [{ value: "b", asked: false }],
            addedOptions: [
                { value: "p_x", label: en("Only in Ladakh") },
                { value: "p_gone", label: en("Withdrawn"), archived: true },
            ],
        }),
    ];
    const ladakhOptions = resolve({
        chain: ["in", "ladakh"],
        categories,
        questions,
        overrides: optionOverrides,
    }).questions.get("marital");
    assert.deepStrictEqual(
        ladakhOptions.options.map((o) => o.value),
        ["a", "p_x"]
    );
    assert.strictEqual(ladakhOptions.options[1].addedBy, "ladakh");
    assert.strictEqual(ladakhOptions.from.options, "ladakh");
    const b = ladakhOptions.allOptions.find((o) => o.value === "b");
    assert.strictEqual(b.asked, false);
    assert.strictEqual(b.hiddenBy, "ladakh");
    ["a", "b", "old", "p_x", "p_gone"].forEach((value) =>
        assert.strictEqual(ladakhOptions.knownValues.has(value), true)
    );
    assert.strictEqual(
        ladakhOptions.options.some((o) => o.value === "p_gone"),
        false
    );
    // A village switches "b" back on and hides the state's own option.
    const villageOptions = run({
        overrides: [
            ...optionOverrides,
            over("v1", "marital", {
                options: [
                    { value: "b", asked: true },
                    { value: "p_x", asked: false },
                ],
            }),
        ],
    }).questions.get("marital");
    assert.deepStrictEqual(
        villageOptions.options.map((o) => o.value),
        ["a", "b"]
    );
    assert.strictEqual(villageOptions.from.options, "v1");
    // Outside the state, the state's option does not exist at all.
    assert.strictEqual(
        resolve({ chain: ["in"], categories, questions, overrides: optionOverrides })
            .questions.get("marital")
            .knownValues.has("p_x"),
        false
    );
    // An archived Master option cannot be switched on by a place: it stays
    // off in the editor's list too, and the attempt is not a "change".
    const revived = run({
        overrides: [over("ladakh", "marital", { options: [{ value: "old", asked: true }] })],
    }).questions.get("marital");
    assert.strictEqual(revived.options.some((o) => o.value === "old"), false);
    assert.strictEqual(revived.allOptions.find((o) => o.value === "old").asked, false);
    assert.strictEqual(revived.from.options, undefined);

    /* ---- a hidden category or group hides what is under it ---- */
    const hiddenPage = run({
        overrides: [
            { ...over("ladakh", "census", { asked: false }), targetType: "category" },
            over("v1", "name", { asked: true }),
        ],
    });
    assert.strictEqual(hiddenPage.categories.get("census").asked, false);
    assert.strictEqual(hiddenPage.categories.get("census").from.asked, "ladakh");
    assert.strictEqual(asked(hiddenPage, "name"), false); // does not pierce
    const hiddenGroup = run({ overrides: [over("ladakh", "entries", { asked: false })] });
    assert.strictEqual(asked(hiddenGroup, "crop"), false);
    assert.strictEqual(asked(hiddenGroup, "eaten"), false);
    const hiddenParentCategory = run({
        overrides: [
            { ...over("in", "food", { asked: false }), targetType: "category" },
        ],
    });
    assert.strictEqual(hiddenParentCategory.categories.get("crops").asked, false);
    assert.strictEqual(asked(hiddenParentCategory, "crop"), false);
    // Archived in the Master: no place can bring it back.
    const archivedCategory = resolve({
        chain,
        categories: categories.map((c) =>
            c._id === "census" ? { ...c, active: false } : c
        ),
        questions,
        overrides: [
            { ...over("v1", "census", { asked: true }), targetType: "category" },
        ],
    });
    assert.strictEqual(archivedCategory.categories.get("census").asked, false);
    assert.strictEqual(
        asked(run({ overrides: [over("v1", "retired", { asked: true })] }), "retired"),
        false
    );

    /* ---- what a place added exists only there and below ---- */
    const owned = [
        ...questions,
        q("ladakh-q", "census", { ownerPlaceId: "ladakh" }),
        q("ladakh-draft", "census", { ownerPlaceId: "ladakh", unpublished: true }),
    ];
    const ownedCategories = [
        ...categories,
        cat("ladakh-page", { ownerPlaceId: "ladakh" }),
    ];
    const ownedQuestions = [...owned, q("in-ladakh-page", "ladakh-page", { ownerPlaceId: "ladakh" })];
    const forV1 = resolve({ chain, categories: ownedCategories, questions: ownedQuestions });
    assert.strictEqual(asked(forV1, "ladakh-q"), true);
    assert.strictEqual(forV1.questions.has("ladakh-draft"), false);
    assert.strictEqual(forV1.categories.has("ladakh-page"), true);
    const forIndia = resolve({ chain: ["in"], categories: ownedCategories, questions: ownedQuestions });
    assert.strictEqual(forIndia.questions.has("ladakh-q"), false);
    assert.strictEqual(forIndia.categories.has("ladakh-page"), false);
    // …and a question whose category this chain cannot see goes with it.
    assert.strictEqual(forIndia.questions.has("in-ladakh-page"), false);
    assert.strictEqual(
        resolve({
            chain,
            categories: ownedCategories,
            questions: ownedQuestions,
            drafts: new Set(["ladakh"]),
        }).questions.has("ladakh-draft"),
        true
    );
    assert.strictEqual(
        resolve({
            chain,
            categories: ownedCategories,
            questions: ownedQuestions,
            drafts: new Set(["master"]),
        }).questions.has("ladakh-draft"),
        false
    );

    /* ---- what the app lists ---- */
    const visible = visibleCategoryIds(master);
    assert.strictEqual(visible.has("census"), true);
    assert.strictEqual(visible.has("crops"), true);
    assert.strictEqual(visible.has("food"), true); // a group with a page left
    assert.strictEqual(visible.has("empty"), false); // a page with nothing asked
    assert.strictEqual(visible.has("lonely-page"), false);
    assert.strictEqual(visible.has("lonely-group"), false); // no page left
    assert.strictEqual(visibleCategoryIds(hiddenPage).has("census"), false);

    assert.deepStrictEqual(askedQuestionIds(master, "crops").sort(), [
        "crop",
        "eaten",
        "entries",
        "use",
    ]);
    assert.deepStrictEqual(askedQuestionIds(hiddenGroup, "crops"), []);
    assert.deepStrictEqual(askedQuestionIds(master, "census").sort(), ["marital", "name"]);

    /* ---- nothing handed in was changed ---- */
    assert.strictEqual(JSON.stringify({ categories, questions }), before);

    /* ---- real ObjectIds: every comparison is by string ---- */
    const oid = () => new mongoose.Types.ObjectId();
    const ids = { india: oid(), state: oid(), village: oid(), page: oid(), question: oid(), own: oid() };
    const real = resolve({
        chain: [ids.india, ids.state, ids.village],
        categories: [cat(ids.page)],
        questions: [
            q(ids.question, new mongoose.Types.ObjectId(String(ids.page))),
            q(ids.own, ids.page, { ownerPlaceId: new mongoose.Types.ObjectId(String(ids.state)) }),
        ],
        overrides: [
            over(new mongoose.Types.ObjectId(String(ids.state)), ids.question, { asked: false }),
            over(String(ids.village), new mongoose.Types.ObjectId(String(ids.question)), { asked: true }),
        ],
    });
    assert.strictEqual(real.questions.get(String(ids.question)).asked, true);
    assert.strictEqual(real.questions.get(String(ids.question)).from.asked, String(ids.village));
    assert.strictEqual(real.questions.get(String(ids.own)).asked, true);
    assert.deepStrictEqual([...visibleCategoryIds(real)], [String(ids.page)]);

    /* ---- a section or a list with nothing left inside it ---- */
    // Ladakh switches off the one field of the section: the section goes
    // with it, the list keeps its other field, and the editor's own switch
    // for the section stays on.
    const hollow = run({ overrides: [over("ladakh", "eaten", { asked: false })] });
    assert.strictEqual(asked(hollow, "use"), false);
    assert.strictEqual(hollow.questions.get("use").selfAsked, true);
    assert.strictEqual(asked(hollow, "entries"), true);
    assert.strictEqual(asked(hollow, "crop"), true);
    // The last field too: the list has nothing to ask, and its page is not
    // listed any more.
    const bare = run({
        overrides: [
            over("ladakh", "eaten", { asked: false }),
            over("ladakh", "crop", { asked: false }),
        ],
    });
    assert.strictEqual(asked(bare, "entries"), false);
    assert.strictEqual(bare.questions.get("entries").selfAsked, true);
    assert.strictEqual(visibleCategoryIds(bare).has("crops"), false);
    assert.deepStrictEqual(askedQuestionIds(bare, "crops"), []);
    // The village switches one field back on: everything above it returns.
    const back = run({
        overrides: [
            over("ladakh", "eaten", { asked: false }),
            over("ladakh", "crop", { asked: false }),
            over("v1", "eaten", { asked: true }),
        ],
    });
    assert.strictEqual(asked(back, "eaten"), true);
    assert.strictEqual(asked(back, "use"), true);
    assert.strictEqual(asked(back, "entries"), true);
    assert.strictEqual(visibleCategoryIds(back).has("crops"), true);
    // In the Master, nothing changed: every container there holds something.
    assert.strictEqual(asked(master, "entries"), true);
    assert.strictEqual(asked(master, "use"), true);

    /* ---- live: nothing above it is archived ---- */
    assert.strictEqual(master.questions.get("name").live, true);
    assert.strictEqual(master.questions.get("retired").live, false);
    // Archiving a page, or a group, writes that one document: what is under
    // it keeps `active: true` and is not live all the same.
    const shut = resolve({
        chain: [],
        categories: categories.map((category) =>
            category._id === "food" ? { ...category, active: false } : category
        ),
        questions,
    });
    assert.strictEqual(shut.categories.get("crops").live, false);
    assert.strictEqual(shut.questions.get("crop").live, false);
    assert.strictEqual(shut.questions.get("eaten").live, false);
    assert.strictEqual(shut.questions.get("name").live, true);
    const noList = resolve({
        chain: [],
        categories,
        questions: questions.map((question) =>
            question._id === "entries" ? { ...question, active: false } : question
        ),
    });
    assert.strictEqual(noList.questions.get("crop").live, false);
    assert.strictEqual(noList.questions.get("eaten").live, false);
    assert.strictEqual(noList.categories.get("crops").live, true);

    console.log("effectiveQuestionnaire: all checks passed");
}
