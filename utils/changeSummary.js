const { isDeepStrictEqual } = require("util");
const { localise } = require("./localised");

/**
 * What a change to the questionnaire is, and how to say it.
 *
 * Three steps, kept apart on purpose:
 *   describe()    fields that differ  ->  { kinds, counts }   (stored in history)
 *   toText()      { kinds, counts }   ->  "wording changed, options changed"
 *   pendingRows() stored documents    ->  the rows of the Publish dialog
 *
 * describeOverride() is describe() for what a PLACE set about a question or
 * category that is not its own to edit (Models/placeOverrides.js).
 *
 * History stores the structure and makes the sentence when it is read, so the
 * wording can change without rewriting what was recorded. The editor and the
 * publish both get their rows from pendingRows(), so what the dialog lists is
 * exactly what a publish does.
 *
 * Pure: `node utils/changeSummary.js` checks it without a database.
 */

/**
 * @param targetType "question" | "category"
 * @param before     the changed fields as published; null for something new
 * @param after      the same fields as they will be; null for a deletion
 * @returns {{kinds: string[], counts: object}} kinds in the order they read
 */
const describe = (targetType, before, after) => {
    const counts = {};
    if (!before) return { kinds: ["new"], counts };
    // Whatever else was pending on it, it goes.
    if (!after || after.deleted) return { kinds: ["deleted"], counts };
    // Retired in favour of another question: that is the whole story, the
    // archiving that comes with it is not a second change.
    if (after.replacedBy) return { kinds: ["replaced"], counts };

    // `null` is a value here (helper text cleared, moved to the top level).
    const changed = (...fields) =>
        fields.some((field) => after[field] !== undefined);

    const kinds = [];
    if (targetType === "category") {
        if (changed("title", "description")) kinds.push("renamed");
        if (changed("parentId", "order")) kinds.push("moved");
    } else {
        if (changed("label", "helper_text")) kinds.push("wording");
        if (changed("options")) kinds.push("options");
        if (changed("required")) kinds.push("required");
        if (changed("type")) kinds.push("type");
        if (changed("min", "max", "presentation")) kinds.push("settings");
        // Along its page, or (a place's own question) to another page.
        if (changed("order", "categoryId")) kinds.push("moved");
    }
    if (after.active === false) kinds.push("archived");
    if (after.active === true) kinds.push("restored");
    return { kinds, counts };
};

/**
 * What a place changed about one question or category. `before` is the state
 * it has published (null or {} when it had set nothing), `after` the state
 * it has drafted: both WHOLE states, so a key that is gone was taken back.
 *
 * The counts say how many options are newly hidden and newly added, measured
 * against what is published.
 */
const describeOverride = (before, after) => {
    const was = before || {};
    const now = after || {};
    const differs = (key) => !isDeepStrictEqual(was[key], now[key]);
    const sets = (state, keys) => keys.some((key) => state[key] !== undefined);

    const kinds = [];
    const counts = {};

    if (differs("asked")) {
        // A switch the place no longer sets is back to what it inherits, and
        // that is the opposite of what it had set: setting a switch to what
        // it inherits is how its key goes (utils/drafts.js overrideUpdate).
        // ponytail: wrong in one case no screen produces — a published
        // switch that a place above has since made redundant, taken back
        // with an explicit null. Telling that apart needs the inherited
        // value, which these rows are made without.
        kinds.push((now.asked ?? !was.asked) ? "shown" : "hidden");
    }

    const wording = ["label", "helper_text"];
    const options = ["options", "addedOptions"];
    // Everything but the switch taken back: not "wording changed".
    const own = [...wording, ...options, "required"];
    if (sets(was, own) && !sets(now, own)) {
        kinds.push("reset");
        return { kinds, counts };
    }

    if (wording.some(differs)) kinds.push("wording");
    if (differs("required")) kinds.push("required");
    if (options.some(differs)) {
        kinds.push("options");
        const values = (list, keep = () => true) =>
            (list || []).filter(keep).map((option) => option.value);
        const off = (option) => option.asked === false;
        const hidden = values(now.options, off).filter(
            (value) => !values(was.options, off).includes(value)
        ).length;
        const added = values(now.addedOptions).filter(
            (value) => !values(was.addedOptions).includes(value)
        ).length;
        // Neither (an option switched back on, an added one reworded) reads
        // "options changed": see optionsText below.
        if (hidden) counts.hidden = hidden;
        if (added) counts.added = added;
    }
    return { kinds, counts };
};

const TEXT = {
    wording: "wording changed",
    renamed: "renamed",
    required: "required changed",
    type: "answer type changed",
    settings: "settings changed",
    moved: "moved",
    archived: "archived",
    restored: "restored",
    deleted: "deleted",
    replaced: "replaced by a new question",
    questions_reordered: "questions reordered",
    categories_reordered: "categories reordered",
    // A place's own changes (describeOverride). "hidden", "shown" and the
    // option counts are worded in toText below.
    reset: "reset to the Master version",
};

const plural = (count, noun) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/**
 * The Master changes its options; a place hides some and adds its own, and
 * says how many ("1 option hidden, 1 added"). The counts are what tell the
 * two apart.
 */
const optionsText = ({ hidden = 0, added = 0 }) => {
    if (!hidden && !added) return "options changed";
    if (!hidden) return `${plural(added, "option")} added`;
    return [`${plural(hidden, "option")} hidden`, added ? `${added} added` : ""]
        .filter(Boolean)
        .join(", ");
};

/**
 * @param change     what describe() returned (or what history stored)
 * @param targetType "question" | "category"
 * @param extra      `replaces`: the label of the question a new one takes
 *                   over from. History stores it on the change itself.
 */
const toText = (change, targetType, extra = change) =>
    (change.kinds || [])
        .map((kind) => {
            if (kind === "new") {
                const replaced = localise(extra?.replaces);
                return `new ${targetType}${
                    replaced ? ` · replaces “${replaced}”` : ""
                }`;
            }
            if (kind === "options") return optionsText(change.counts || {});
            if (kind === "hidden" || kind === "shown") {
                return targetType === "category" ? `category ${kind}` : kind;
            }
            // Not a publish: Locations moved a place (Controllers/places.js).
            if (kind === "place_moved") {
                return `moved from ${change.from} to ${change.to}`;
            }
            return TEXT[kind] || kind;
        })
        .join(", ");

/* ------------------------------------------------------------------ */
/* The rows of the Publish dialog                                      */
/* ------------------------------------------------------------------ */

const FIELDS = {
    question: [
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
        "replaces",
    ],
    category: ["title", "description", "parentId", "is_screen", "order", "active"],
};
const NAME = { question: "label", category: "title" };
// The two types that own other questions.
const CONTAINERS = ["repeatable_group", "section"];
const REORDERED = {
    question: "questions_reordered",
    category: "categories_reordered",
};

const pick = (doc, fields) =>
    Object.fromEntries(
        fields
            .filter((field) => doc[field] !== undefined)
            .map((field) => [field, doc[field]])
    );

/**
 * One entry per thing a person would publish or discard as a unit.
 *
 * @param categories lean documents as stored — drafts NOT applied
 * @param questions  the same
 * @param overrides  lean place_overrides documents, the same
 * @param only       Set of "type:id". A publish passes the documents it was
 *                   sent, and the rows are then made of those alone.
 * @param places     Map of place id -> the names that lead to that place.
 *                   Left out, the rows are the Master's. Given, they are what
 *                   THOSE places added and changed, each row under its own
 *                   place, and none of the Master's.
 * @returns rows `{ key, items, placeId, placeNames, targetType, targetId,
 *          label, change, summary, dependsOn, before, after }`. `items` is
 *          what to send back to publish or discard the row; `dependsOn` holds
 *          the keys of rows that must go out with or before it.
 */
const pendingRows = ({
    categories = [],
    questions = [],
    overrides = [],
    only,
    places,
}) => {
    const idOf = (doc) => String(doc._id);
    const keyOf = (type, doc) => `${type}:${idOf(doc)}`;
    // Whose work a document is: the place that added it, or that made the
    // override. null is the Master.
    const placeOf = (type, doc) =>
        (type === "override" ? doc.placeId : doc.ownerPlaceId) || null;
    // The Master's own documents — or those of the places handed in — and,
    // for a publish, only what was sent.
    const mine = (type) => (doc) => {
        const place = placeOf(type, doc);
        const wanted = places
            ? Boolean(place) && places.has(String(place))
            : !place;
        return wanted && (!only || only.has(keyOf(type, doc)));
    };
    /** The place a row is listed under, and the names that lead to it. */
    const placed = (type, doc) => {
        const place = placeOf(type, doc);
        return {
            placeId: place,
            placeNames: (place && places?.get(String(place))) || [],
        };
    };
    const itemOf = (type) => (doc) => ({
        type,
        id: idOf(doc),
        rev: doc.rev || 0,
    });
    const draftOf = (doc) =>
        (!doc.unpublished && doc.hasDraft && doc.draft) || null;
    const onlyOrder = (draft) => Object.keys(draft).join() === "order";
    const seen = (doc) => ({ ...doc, ...draftOf(doc) });

    const categoryById = new Map(categories.map((c) => [idOf(c), c]));
    const questionById = new Map(questions.map((q) => [idOf(q), q]));

    // Nothing may be published into a category the app cannot see yet.
    const waitsForCategory = (id) =>
        categoryById.get(String(id))?.unpublished ? [`category:${id}`] : [];

    /** The row of one document; `others` are published and discarded with it. */
    const rowFor = (type, doc, dependsOn, others = []) => {
        const draft = draftOf(doc);
        const deleted = Boolean(draft?.deleted);
        // Something new has no "before"; a deletion has no "after" and
        // records everything that goes.
        const before = draft
            ? pick(doc, deleted ? FIELDS[type] : Object.keys(draft))
            : null;
        const after = deleted ? null : draft || pick(doc, FIELDS[type]);

        const change = describe(type, before, after);
        const replaced =
            doc.unpublished &&
            doc.replaces &&
            questionById.get(String(doc.replaces));
        if (replaced) change.replaces = seen(replaced).label;

        return {
            ...placed(type, doc),
            key: keyOf(type, doc),
            items: [doc, ...others].map(itemOf(type)),
            targetType: type,
            targetId: doc._id,
            // As it will read once published; a deletion keeps the name it had.
            label: (deleted ? doc : seen(doc))[NAME[type]],
            change,
            summary: toText(change, type),
            dependsOn,
            before,
            after,
        };
    };

    /** Documents that only changed position are one row, not one each. */
    const reorderRow = (key, type, docs, target, label) => {
        const change = { kinds: [REORDERED[type]], counts: {} };
        return {
            // Only the Master can be reordered: one place for all of them.
            ...placed(type, docs[0]),
            key,
            items: docs.map(itemOf(type)),
            targetType: "category",
            targetId: target,
            label,
            change,
            summary: toText(change, "category"),
            dependsOn: [],
            before: {
                order: docs.map((doc) => ({ id: doc._id, order: doc.order })),
            },
            after: {
                order: docs.map((doc) => ({
                    id: doc._id,
                    order: doc.draft.order,
                })),
            },
        };
    };

    const rows = [];

    /* ---- categories ---- */

    const movedCategories = [];
    categories.filter(mine("category")).forEach((category) => {
        const draft = draftOf(category);
        if (!category.unpublished && !draft) return;
        if (draft && onlyOrder(draft)) {
            movedCategories.push(category);
            return;
        }
        // New, or moving: where it will sit has to be published first.
        rows.push(
            rowFor(
                "category",
                category,
                waitsForCategory(seen(category).parentId)
            )
        );
    });
    if (movedCategories.length > 0) {
        rows.push(
            reorderRow("order:categories", "category", movedCategories, null, {
                en: "Categories",
            })
        );
    }

    /* ---- new questions ---- */

    const fresh = questions
        .filter(mine("question"))
        .filter((question) => question.unpublished);
    const freshIds = new Set(fresh.map(idOf));
    const parentOf = (question) =>
        questionById.get(String(question.parentQuestionId));

    /** The highest question reached by climbing through `through` parents. */
    const topOf = (question, through) => {
        let top = question;
        const climbed = new Set([idOf(top)]);
        let parent = parentOf(top);
        while (parent && through(parent) && !climbed.has(idOf(parent))) {
            climbed.add(idOf(parent));
            top = parent;
            parent = parentOf(top);
        }
        return top;
    };

    // A new group and its fields are one thing only while they are one
    // place's: a field a village adds to its state's new group is the
    // village's own row, under the village.
    const ownedAs = (question) => (other) =>
        String(other.ownerPlaceId || "") === String(question.ownerPlaceId || "");

    /** The row a new question is part of when everything new is sent. */
    const rowKeyOf = (question) =>
        keyOf(
            "question",
            topOf(
                question,
                (above) => above.unpublished && ownedAs(question)(above)
            )
        );

    /** The row a new question has to wait for because of what it sits in. */
    const waitsForParent = (parent) => {
        if (!parent) return [];
        // Sent without the new question it sits in (a publish can be
        // partial): it waits for the row that one belongs to. Unless that
        // one was not sent at all — only a hand-made request leaves out the
        // middle of a new group — and then it waits for the question
        // itself, which no row holds: published, it would hang under
        // something the app cannot see.
        if (parent.unpublished) {
            const own = keyOf("question", parent);
            return [only && !only.has(own) ? own : rowKeyOf(parent)];
        }
        // A published question that only BECOMES a group or section with its
        // draft: until that is out, it cannot hold anything. With that draft
        // gone it waits for a row nobody can send, and is never put out
        // inside a plain question.
        return CONTAINERS.includes(parent.type)
            ? []
            : [keyOf("question", parent)];
    };

    // A new question inside a new question is not a row of its own: a group
    // and its fields are published, or discarded, as the one thing they are.
    // The climb stops at a parent that is published, that was not sent, or
    // that is another place's.
    const folded = new Map();
    fresh.forEach((question) => {
        const top = topOf(
            question,
            (parent) =>
                freshIds.has(idOf(parent)) && ownedAs(question)(parent)
        );
        const key = idOf(top);
        if (!folded.has(key)) folded.set(key, []);
        if (top !== question) folded.get(key).push(question);
    });
    fresh
        .filter((question) => folded.has(idOf(question)))
        .forEach((top) => {
            rows.push(
                rowFor(
                    "question",
                    top,
                    [
                        ...waitsForCategory(top.categoryId),
                        ...waitsForParent(parentOf(top)),
                    ],
                    folded.get(idOf(top))
                )
            );
        });

    /* ---- changes to published questions ---- */

    const movedOn = new Map();
    questions.filter(mine("question")).forEach((question) => {
        const draft = draftOf(question);
        if (!draft) return;
        if (!onlyOrder(draft)) {
            // On its way to a page that is itself new (a place moving its
            // question to its new page): the page goes out first.
            rows.push(
                rowFor(
                    "question",
                    question,
                    draft.categoryId ? waitsForCategory(draft.categoryId) : []
                )
            );
            return;
        }
        const page = String(question.categoryId);
        movedOn.set(page, [...(movedOn.get(page) || []), question]);
    });
    movedOn.forEach((docs, pageId) => {
        const page = categoryById.get(pageId);
        rows.push(
            reorderRow(
                `order:${pageId}`,
                "question",
                docs,
                page ? page._id : pageId,
                page ? seen(page).title : { en: "Questions" }
            )
        );
    });

    /* ---- what a place changed about a question or category ---- */

    overrides.filter(mine("override")).forEach((override) => {
        if (!override.hasDraft) return;
        const type = override.targetType;
        const target = (type === "question" ? questionById : categoryById).get(
            String(override.targetId)
        );
        // Its target is deleted with it (utils/drafts.js); one that is
        // somehow left has nothing to be listed under.
        if (!target) return;

        const before = override.published || null;
        const after = override.draft || {};
        const change = describeOverride(before, after);
        // Nothing a place sets about something NEW can go out before it.
        const waits = (key) => (target.unpublished ? [key] : []);

        rows.push({
            ...placed("override", override),
            key: keyOf("override", override),
            items: [itemOf("override")(override)],
            targetType: type,
            targetId: override.targetId,
            // The place's own wording when it has one, as it will read there.
            label: after.label || target[NAME[type]],
            change,
            summary: toText(change, type),
            dependsOn:
                type === "question"
                    ? waits(rowKeyOf(target))
                    : waits(keyOf("category", target)),
            before,
            after,
        });
    });

    return rows;
};

module.exports = { describe, describeOverride, toText, pendingRows };

/* Self-check: node utils/changeSummary.js */
if (require.main === module) {
    const assert = require("assert");
    const mongoose = require("mongoose");
    // The real writer and the real publish: every fixture below is what an
    // edit would have stored, and is put out the way a publish would. So the
    // rules of a draft, start to end (utils/drafts.js), are checked here too.
    const {
        STALE,
        TYPE_LOCKED,
        applied,
        draftUpdate,
        overrideUpdate,
        planPublish,
        ancestors,
        below,
    } = require("./drafts");

    const en = (text) => ({ en: text });
    const cat = (_id, extra = {}) => ({
        _id,
        title: en(_id),
        parentId: null,
        path: [],
        depth: 0,
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
        type: "text",
        options: [],
        required: false,
        order: 1,
        active: true,
        ...extra,
    });
    // What the database holds after one edit.
    const edit = (doc, patch) => {
        const { $set, $unset = {}, $inc } = draftUpdate(doc, patch, "admin");
        const next = { ...doc, ...$set, rev: (doc.rev || 0) + $inc.rev };
        Object.keys($unset).forEach((field) => delete next[field]);
        return next;
    };

    /* ---- one sentence per kind of change ---- */

    const say = (type, before, after, extra) =>
        toText(describe(type, before, after), type, extra);
    const A = en("a");
    const B = en("b");

    assert.strictEqual(say("question", null, { label: A }), "new question");
    assert.strictEqual(
        say("question", null, { label: A }, { replaces: en("Old") }),
        "new question · replaces “Old”"
    );
    assert.strictEqual(say("question", { label: A }, { label: B }), "wording changed");
    assert.strictEqual(
        say("question", { helper_text: A }, { helper_text: {} }),
        "wording changed"
    );
    assert.strictEqual(
        say("question", { options: [] }, { options: [{ value: "x", label: A }] }),
        "options changed"
    );
    assert.strictEqual(
        say("question", { required: false }, { required: true }),
        "required changed"
    );
    assert.strictEqual(
        say("question", { type: "text" }, { type: "number" }),
        "answer type changed"
    );
    assert.strictEqual(say("question", { min: null }, { min: 1 }), "settings changed");
    assert.strictEqual(say("question", { max: 9 }, { max: null }), "settings changed");
    assert.strictEqual(
        say("question", { presentation: "inline" }, { presentation: "screen" }),
        "settings changed"
    );
    assert.strictEqual(say("question", { order: 1 }, { order: 2 }), "moved");
    assert.strictEqual(say("question", { active: true }, { active: false }), "archived");
    assert.strictEqual(say("question", { active: false }, { active: true }), "restored");
    assert.strictEqual(say("question", { label: A }, null), "deleted");
    // A deletion is the only thing said, whatever else was waiting.
    assert.strictEqual(
        say("question", { label: A }, { label: B, deleted: true }),
        "deleted"
    );
    assert.strictEqual(
        say("question", { label: A, options: [] }, { label: B, options: [{ value: "x", label: A }] }),
        "wording changed, options changed"
    );
    assert.strictEqual(
        say(
            "question",
            { active: true, replacedBy: null },
            { active: false, replacedBy: "another" }
        ),
        "replaced by a new question"
    );

    assert.strictEqual(say("category", null, { title: A }), "new category");
    assert.strictEqual(say("category", { title: A }, { title: B }), "renamed");
    assert.strictEqual(
        say("category", { description: A }, { description: {} }),
        "renamed"
    );
    // To the top level: null is where it goes, not "no change".
    assert.strictEqual(say("category", { parentId: "p" }, { parentId: null }), "moved");
    assert.strictEqual(say("category", { order: 1 }, { order: 2 }), "moved");
    assert.strictEqual(say("category", { active: true }, { active: false }), "archived");
    assert.strictEqual(say("category", { active: false }, { active: true }), "restored");
    assert.strictEqual(say("category", { title: A }, null), "deleted");
    assert.strictEqual(
        say("category", { title: A, active: true }, { title: B, active: false }),
        "renamed, archived"
    );

    // What only a place does. Nothing derives these yet; history will hold them.
    const text = (kinds, type = "question", counts) => toText({ kinds, counts }, type);
    assert.strictEqual(
        text(["options"], "question", { hidden: 1, added: 1 }),
        "1 option hidden, 1 added"
    );
    assert.strictEqual(text(["options"], "question", { hidden: 2 }), "2 options hidden");
    assert.strictEqual(text(["options"], "question", { added: 1 }), "1 option added");
    assert.strictEqual(text(["hidden"]), "hidden");
    assert.strictEqual(text(["shown"]), "shown");
    assert.strictEqual(text(["hidden"], "category"), "category hidden");
    assert.strictEqual(text(["shown"], "category"), "category shown");
    assert.strictEqual(text(["reset"]), "reset to the Master version");
    // History is stored without its empty `counts`: still readable.
    assert.strictEqual(toText({ kinds: ["wording", "options"] }, "question"), "wording changed, options changed");

    /* ---- what an edit stores ---- */

    const stored = q("stored", "census", {
        label: en("Name"),
        helper_text: en("As on your ID"),
        options: [{ value: "a", label: A }],
    });
    const reworded = edit(stored, { label: en("Full name") });
    assert.deepStrictEqual(reworded.draft, { label: en("Full name") });
    assert.strictEqual(reworded.hasDraft, true);
    assert.strictEqual(reworded.rev, 1);
    // The published field is not touched; the editor sees the draft over it.
    assert.deepStrictEqual(reworded.label, en("Name"));
    assert.deepStrictEqual(applied(reworded).label, en("Full name"));
    // A second edit joins the first.
    const twice = edit(reworded, { required: true });
    assert.deepStrictEqual(twice.draft, { label: en("Full name"), required: true });
    // Set back to what is published, a field leaves the draft …
    const half = edit(twice, { label: en("Name") });
    assert.deepStrictEqual(half.draft, { required: true });
    // … and a draft with nothing left is removed, never stored as {}.
    const none = edit(half, { required: false });
    assert.strictEqual(none.hasDraft, false);
    assert.strictEqual("draft" in none, false);
    assert.strictEqual(none.rev, 4);
    // {} / null / missing wording are the same nothing.
    assert.strictEqual(edit(q("bare", "census"), { helper_text: {} }).hasDraft, false);
    assert.strictEqual(edit(stored, { helper_text: {} }).hasDraft, true);
    // An option that is not archived may say so or not; archiving is a change.
    assert.strictEqual(
        edit(stored, { options: [{ value: "a", label: A, archived: false }] }).hasDraft,
        false
    );
    assert.strictEqual(
        edit(stored, { options: [{ value: "a", label: A, archived: true }] }).hasDraft,
        true
    );
    // An id is the same id as an ObjectId or as the string the dashboard sent.
    const parent = new mongoose.Types.ObjectId();
    assert.strictEqual(
        edit(cat("child", { parentId: parent }), { parentId: String(parent) }).hasDraft,
        false
    );
    // Never published: the fields themselves are written, and no draft appears.
    const fresh = edit(q("fresh", "census", { unpublished: true }), { label: B });
    assert.deepStrictEqual(fresh.label, B);
    assert.strictEqual("draft" in fresh, false);
    assert.strictEqual(fresh.rev, 1);
    // A discard drops the whole draft.
    assert.strictEqual(edit(twice, null).hasDraft, false);
    assert.strictEqual("draft" in edit(twice, null), false);

    /* ---- what a place's change stores ---- */

    // What the database holds after one change to an override: the document,
    // or null when there is none (any more). `identity` is whose it is.
    let serial = 0;
    const put = (override, patch, inherited, identity = {}) => {
        const { action, update } = overrideUpdate(override, patch, inherited, "admin");
        if (action === "none") return override;
        if (action === "delete") return null;
        const was = override || { _id: `o${(serial += 1)}`, rev: 0, ...identity };
        const next = { ...was, ...update.$set, rev: was.rev + update.$inc.rev };
        Object.keys(update.$unset || {}).forEach((field) => delete next[field]);
        return next;
    };
    // The same override once a publish has put its draft out.
    const live = ({ draft, ...override }) => ({
        ...override,
        published: draft,
        hasDraft: false,
    });
    // What Ladakh is asked while it has changed nothing itself.
    const inherited = {
        asked: true,
        label: en("Marital status"),
        helper_text: {},
        options: [
            { value: "a", archived: false, asked: true },
            { value: "b", archived: false, asked: true },
            { value: "old", archived: true, asked: false },
        ],
    };

    // Set to what it already is, nothing is stored at all: a switch that is
    // on anyway, the wording above, an option that is offered anyway, one
    // the Master archived (no place brings that back), one that is not there.
    assert.strictEqual(put(null, { asked: true }, inherited), null);
    assert.strictEqual(put(null, { label: en("Marital status") }, inherited), null);
    assert.strictEqual(put(null, { helper_text: {} }, inherited), null);
    assert.strictEqual(
        put(
            null,
            {
                options: [
                    { value: "a", asked: true },
                    { value: "old", asked: true },
                    { value: "nowhere", asked: false },
                ],
            },
            inherited
        ),
        null
    );

    // Required is a value either way: "not required" is stored where the
    // place above requires it, and is nothing where it is not required anyway.
    const optionalAbove = { ...inherited, required: false };
    const requiredAbove = { ...inherited, required: true };
    assert.strictEqual(put(null, { required: false }, optionalAbove), null);
    const eased = put(null, { required: false }, requiredAbove);
    assert.deepStrictEqual(eased.draft, { required: false });
    assert.strictEqual(put(eased, { required: null }, requiredAbove), null);
    assert.strictEqual(
        toText(describeOverride({}, eased.draft), "question"),
        "required changed"
    );
    assert.deepStrictEqual(describeOverride(eased.draft, {}).kinds, ["reset"]);

    // A hide is stored — as a draft, the WHOLE next state.
    const hide = put(null, { asked: false }, inherited);
    assert.deepStrictEqual(hide.draft, { asked: false });
    assert.strictEqual(hide.hasDraft, true);
    assert.strictEqual(hide.rev, 1);
    assert.strictEqual("published" in hide, false);
    // The same again changes nothing, and the rev stays where it was.
    assert.strictEqual(put(hide, { asked: false }, inherited), hide);
    // A second change joins the first; what changes nothing is left out of it.
    const busy = put(
        hide,
        {
            label: en("Married?"),
            helper_text: {},
            options: [
                { value: "b", asked: false },
                { value: "a", asked: true },
            ],
        },
        inherited
    );
    assert.deepStrictEqual(busy.draft, {
        asked: false,
        label: en("Married?"),
        options: [{ value: "b", asked: false }],
    });
    assert.strictEqual(busy.rev, 2);
    // null takes a key back.
    assert.deepStrictEqual(put(busy, { label: null }, inherited).draft, {
        asked: false,
        options: [{ value: "b", asked: false }],
    });
    // Switched back on with nothing published: no document is left.
    assert.strictEqual(put(hide, { asked: true }, inherited), null);

    // An option the place adds gets its key here, once …
    const added = put(null, { addedOptions: [{ label: en("Engaged") }] }, inherited);
    const [engaged] = added.draft.addedOptions;
    assert.match(engaged.value, /^p_[a-f0-9]{24}$/);
    assert.deepStrictEqual(engaged, { value: engaged.value, label: en("Engaged") });
    // … and keeps it on every later save, reworded or archived, while a
    // second new option gets a key of its own.
    const addedMore = put(
        added,
        {
            addedOptions: [
                { value: engaged.value, label: en("Betrothed"), archived: true },
                { label: en("Widowed") },
            ],
        },
        inherited
    );
    assert.deepStrictEqual(addedMore.draft.addedOptions[0], {
        value: engaged.value,
        label: en("Betrothed"),
        archived: true,
    });
    assert.match(addedMore.draft.addedOptions[1].value, /^p_[a-f0-9]{24}$/);
    assert.notStrictEqual(addedMore.draft.addedOptions[1].value, engaged.value);
    // A key the place was not issued is refused: "a" is the Master's.
    assert.throws(
        () => put(added, { addedOptions: [{ value: "a", label: en("Mine") }] }, inherited),
        { statusCode: 400 }
    );
    // Its own option is on offer there, so it can be switched off — and
    // switching on what is on anyway is, again, nothing.
    assert.deepStrictEqual(
        put(added, { options: [{ value: engaged.value, asked: false }] }, inherited)
            .draft.options,
        [{ value: engaged.value, asked: false }]
    );
    assert.strictEqual(
        "options" in
            put(added, { options: [{ value: engaged.value, asked: true }] }, inherited)
                .draft,
        false
    );

    // Once published, a change is a draft beside it …
    const out = live(busy);
    const shown = put(out, { asked: true }, inherited);
    assert.deepStrictEqual(shown.draft, {
        label: en("Married?"),
        options: [{ value: "b", asked: false }],
    });
    assert.deepStrictEqual(shown.published, out.published);
    // … which a change back to what is published removes again …
    const undone = put(shown, { asked: false }, inherited);
    assert.strictEqual(undone.hasDraft, false);
    assert.strictEqual("draft" in undone, false);
    assert.strictEqual(undone.rev, shown.rev + 1);
    // … and with everything taken back it is an EMPTY draft, still a draft:
    // what is published stays out until a publish removes it.
    const emptied = put(out, { asked: null, label: null, options: null }, inherited);
    assert.deepStrictEqual(emptied.draft, {});
    assert.strictEqual(emptied.hasDraft, true);

    // A place above now hides the question too, so the published
    // `asked: false` changes nothing any more. It stays all the same —
    // through a save that leaves it alone, and through one that sets it
    // again: dropping it would list either as "shown". Set afresh, with
    // nothing published, the same value is not kept.
    const hiddenAbove = { ...inherited, asked: false };
    assert.deepStrictEqual(
        put(out, { helper_text: en("Tick one") }, hiddenAbove).draft,
        { ...out.published, helper_text: en("Tick one") }
    );
    assert.strictEqual(put(out, { asked: false }, hiddenAbove), out);
    assert.strictEqual(put(null, { asked: false }, hiddenAbove), null);
    // What a save leaves alone is not judged at all. A DRAFT made redundant
    // from above — by what may itself be only a draft, gone tomorrow — is
    // not for a later save of something else to drop: not the switch …
    assert.deepStrictEqual(
        put(hide, { label: en("Married?") }, hiddenAbove).draft,
        { asked: false, label: en("Married?") }
    );
    // … and not an option switched off here that is now off above as well.
    const bOffAbove = {
        ...inherited,
        options: inherited.options.map((option) =>
            option.value === "b" ? { ...option, asked: false } : option
        ),
    };
    assert.deepStrictEqual(put(busy, { asked: true }, bOffAbove).draft, {
        label: en("Married?"),
        options: [{ value: "b", asked: false }],
    });
    // Sent again, that entry is judged: it changes nothing there now — and
    // goes, unless that is how it is published.
    assert.deepStrictEqual(
        put(busy, { options: [{ value: "b", asked: false }] }, bOffAbove).draft,
        { asked: false, label: en("Married?") }
    );
    assert.strictEqual(
        put(out, { options: [{ value: "b", asked: false }] }, bOffAbove),
        out
    );

    // A discard: a never-published override goes, a published one loses its
    // draft, and with no draft there is nothing to do.
    assert.strictEqual(put(hide, null), null);
    assert.strictEqual(put(shown, null).hasDraft, false);
    assert.deepStrictEqual(put(shown, null).published, out.published);
    assert.strictEqual(put(out, null), out);

    /* ---- the rows of the Publish dialog ---- */

    const categories = [
        cat("census"),
        // A new page, with a new question on it.
        cat("newpage", { unpublished: true }),
        // A new category holding a new page, and a published page moving in.
        cat("shelf", { unpublished: true, is_screen: false }),
        cat("nested", {
            unpublished: true,
            parentId: "shelf",
            path: ["shelf"],
            depth: 1,
        }),
        edit(cat("farm"), { parentId: "shelf" }),
        // Two that only changed position.
        edit(cat("c1", { order: 1 }), { order: 2 }),
        edit(cat("c2", { order: 2 }), { order: 1 }),
        edit(cat("renamed"), { title: en("Renamed"), order: 5 }),
        // Somewhere else's: never the Master's to publish.
        cat("ladakh-page", { unpublished: true, ownerPlaceId: "ladakh" }),
    ];
    const questions = [
        edit(q("name", "census"), { label: en("Full name") }),
        // A new group and its two new fields.
        q("crops", "census", { unpublished: true, type: "repeatable_group" }),
        q("crop", "census", { unpublished: true, parentQuestionId: "crops" }),
        q("area", "census", { unpublished: true, parentQuestionId: "crops" }),
        // Three that only moved …
        edit(q("a", "census", { order: 1 }), { order: 3 }),
        edit(q("b", "census", { order: 2 }), { order: 1 }),
        edit(q("c", "census", { order: 3 }), { order: 2 }),
        // … and one that moved and was reworded.
        edit(q("age", "census", { order: 4 }), { order: 9, label: en("Age in years") }),
        q("onnew", "newpage", { unpublished: true }),
        // A replacement, and what it replaces.
        edit(q("old", "census"), { label: en("Old") }),
        q("old-v2", "census", { unpublished: true, replaces: "old" }),
        edit(q("gone", "census"), { label: en("Never mind"), deleted: true }),
        q("untouched", "census"),
        q("ladakh-q", "census", { unpublished: true, ownerPlaceId: "ladakh" }),
    ];

    const rows = pendingRows({ categories, questions });
    const row = (key) => rows.find((entry) => entry.key === key);
    const ids = (entry) => entry.items.map((item) => item.id);

    assert.strictEqual(new Set(rows.map((entry) => entry.key)).size, rows.length);
    rows.forEach((entry) => {
        assert.strictEqual(entry.placeId, null);
        assert.deepStrictEqual(entry.placeNames, []);
    });

    // Reworded: one row, saying what changed and holding only that field.
    const name = row("question:name");
    assert.strictEqual(name.summary, "wording changed");
    assert.deepStrictEqual(name.items, [{ type: "question", id: "name", rev: 1 }]);
    assert.strictEqual(name.targetType, "question");
    assert.strictEqual(name.targetId, "name");
    assert.deepStrictEqual(name.label, en("Full name"));
    assert.deepStrictEqual(name.before, { label: en("name") });
    assert.deepStrictEqual(name.after, { label: en("Full name") });
    assert.deepStrictEqual(name.dependsOn, []);

    // A new group and its fields are one "new question".
    const crops = row("question:crops");
    assert.strictEqual(crops.summary, "new question");
    assert.deepStrictEqual(ids(crops), ["crops", "crop", "area"]);
    assert.strictEqual(crops.before, null);
    assert.strictEqual(crops.after.type, "repeatable_group");
    assert.strictEqual(row("question:crop"), undefined);
    assert.strictEqual(row("question:area"), undefined);

    // Three that only moved are one row about their page …
    const moved = row("order:census");
    assert.strictEqual(moved.summary, "questions reordered");
    assert.strictEqual(moved.targetType, "category");
    assert.strictEqual(moved.targetId, "census");
    assert.deepStrictEqual(moved.label, en("census"));
    assert.deepStrictEqual(ids(moved), ["a", "b", "c"]);
    assert.deepStrictEqual(moved.items[0], { type: "question", id: "a", rev: 1 });
    assert.deepStrictEqual(moved.before.order[0], { id: "a", order: 1 });
    assert.deepStrictEqual(moved.after.order[0], { id: "a", order: 3 });
    assert.strictEqual(row("question:a"), undefined);
    // … but one that was also reworded is its own.
    assert.strictEqual(row("question:age").summary, "wording changed, moved");
    assert.strictEqual(ids(moved).includes("age"), false);

    // A new question on a new page waits for the page.
    assert.strictEqual(row("category:newpage").summary, "new category");
    assert.deepStrictEqual(row("category:newpage").dependsOn, []);
    assert.deepStrictEqual(row("question:onnew").dependsOn, ["category:newpage"]);
    // So does a new page in a new category, and a published one moving in.
    assert.deepStrictEqual(row("category:nested").dependsOn, ["category:shelf"]);
    assert.strictEqual(row("category:farm").summary, "moved");
    assert.deepStrictEqual(row("category:farm").dependsOn, ["category:shelf"]);
    assert.deepStrictEqual(row("category:farm").before, { parentId: null });

    // A replacement says what it replaces, by the name the editor shows;
    // the old question gets no row for being retired, only for its own edit.
    assert.strictEqual(
        row("question:old-v2").summary,
        "new question · replaces “Old”"
    );
    assert.deepStrictEqual(row("question:old-v2").change.replaces, en("Old"));
    assert.strictEqual(row("question:old").summary, "wording changed");

    // A deletion keeps the name the question had and records what goes.
    const gone = row("question:gone");
    assert.strictEqual(gone.summary, "deleted");
    assert.deepStrictEqual(gone.label, en("gone"));
    assert.strictEqual(gone.after, null);
    assert.strictEqual(gone.before.type, "text");

    // Categories that only moved are one row; a renamed one is its own.
    const shuffled = row("order:categories");
    assert.strictEqual(shuffled.summary, "categories reordered");
    assert.deepStrictEqual(ids(shuffled), ["c1", "c2"]);
    assert.strictEqual(shuffled.items[0].type, "category");
    assert.strictEqual(shuffled.targetId, null);
    assert.strictEqual(row("category:renamed").summary, "renamed, moved");
    assert.deepStrictEqual(row("category:renamed").label, en("Renamed"));

    // Nothing pending, nothing listed; and a place's work is not the Master's.
    assert.strictEqual(row("question:untouched"), undefined);
    assert.strictEqual(row("category:census"), undefined);
    assert.strictEqual(row("question:ladakh-q"), undefined);
    assert.strictEqual(row("category:ladakh-page"), undefined);
    // 5 categories + their reorder, 3 new questions, 4 edited + their reorder.
    assert.strictEqual(rows.length, 14);

    // A publish names its documents. A field sent without its new group is a
    // row of its own that waits for the group …
    const alone = pendingRows({
        categories,
        questions,
        only: new Set(["question:crop"]),
    });
    assert.deepStrictEqual(
        alone.map((entry) => [entry.key, entry.dependsOn]),
        [["question:crop", ["question:crops"]]]
    );
    // … and a group sent with one of its two fields takes just that one.
    const some = pendingRows({
        categories,
        questions,
        only: new Set(["question:crops", "question:area"]),
    });
    assert.deepStrictEqual(some.map(ids), [["crops", "area"]]);
    // A reorder is made of what was sent, too.
    assert.deepStrictEqual(
        pendingRows({
            categories,
            questions,
            only: new Set(["question:a", "question:c"]),
        }).map(ids),
        [["a", "c"]]
    );

    // A text question waiting to become a group can already be given fields
    // in the editor. They wait for the change that makes it one.
    const becoming = [
        edit(q("tally", "census"), { type: "repeatable_group" }),
        q("tally-item", "census", {
            unpublished: true,
            parentQuestionId: "tally",
        }),
    ];
    assert.deepStrictEqual(
        pendingRows({
            categories: [cat("census")],
            questions: becoming,
        }).map((entry) => [entry.key, entry.dependsOn]),
        [
            ["question:tally-item", ["question:tally"]],
            ["question:tally", []],
        ]
    );

    /* ---- the same dialog for a place: Ladakh, and Village 1 inside it ---- */

    // The names that lead to each place, as the dialog heads its rows.
    const ladakhAndBelow = new Map([
        ["ladakh", ["Ladakh"]],
        ["v1", ["Ladakh", "Village 1"]],
    ]);
    // One place's first change to one target, not yet published.
    const set = (placeId, targetId, patch, from = inherited, targetType = "question") =>
        put(null, patch, from, { placeId, targetType, targetId });

    const hides = set("ladakh", "name", { asked: false });
    // Village 1 switches back on what Ladakh hides.
    const shows = set("v1", "name", { asked: true }, { ...inherited, asked: false });
    const rewords = set("ladakh", "age", { label: en("Age (Ladakh)") });
    const narrows = set("ladakh", "untouched", {
        options: [{ value: "b", asked: false }],
        addedOptions: [{ label: en("Engaged") }],
    });
    // Published wording, now taken back.
    const resets = put(live(set("ladakh", "b", { label: en("B here") })), { label: null }, inherited);
    const hidesPage = set("ladakh", "census", { asked: false }, { asked: true }, "category");
    // What Village 1 sets about a question and a page Ladakh has only just added.
    const hidesNew = set("v1", "ladakh-q", { asked: false });
    const hidesNewPage = set("v1", "ladakh-page", { asked: false }, { asked: true }, "category");
    // Published and with nothing drafted: not a pending change.
    const settled = live(set("ladakh", "c", { asked: false }));
    const placeOverrides = [
        hides,
        shows,
        rewords,
        narrows,
        resets,
        hidesPage,
        hidesNew,
        hidesNewPage,
        settled,
    ];
    const placeQuestions = [
        ...questions,
        // Ladakh's new group with a field of its own, and one Village 1 adds.
        q("l-group", "census", { unpublished: true, ownerPlaceId: "ladakh", type: "repeatable_group" }),
        q("l-field", "census", { unpublished: true, ownerPlaceId: "ladakh", parentQuestionId: "l-group" }),
        q("v-field", "census", { unpublished: true, ownerPlaceId: "v1", parentQuestionId: "l-group" }),
        // Ladakh's published group, on its way to Ladakh's new page.
        edit(q("l-moved", "census", { ownerPlaceId: "ladakh", type: "repeatable_group" }), {
            categoryId: "ladakh-page",
        }),
        q("l-moved-field", "census", { ownerPlaceId: "ladakh", parentQuestionId: "l-moved" }),
    ];

    const placeRows = pendingRows({
        categories,
        questions: placeQuestions,
        overrides: placeOverrides,
        places: ladakhAndBelow,
    });
    const placeRow = (key) => placeRows.find((entry) => entry.key === key);
    const overrideRow = (override) => placeRow(`override:${override._id}`);
    const said = (override) => overrideRow(override).summary;

    assert.strictEqual(said(hides), "hidden");
    assert.strictEqual(said(shows), "shown");
    assert.strictEqual(said(rewords), "wording changed");
    assert.strictEqual(said(narrows), "1 option hidden, 1 added");
    assert.strictEqual(said(resets), "reset to the Master version");
    assert.strictEqual(said(hidesPage), "category hidden");
    assert.strictEqual(overrideRow(settled), undefined);

    // An override is a row of its own, under the place that made it: sent
    // back as the override, but ABOUT the question.
    assert.deepStrictEqual(overrideRow(hides), {
        placeId: "ladakh",
        placeNames: ["Ladakh"],
        key: `override:${hides._id}`,
        items: [{ type: "override", id: hides._id, rev: 1 }],
        targetType: "question",
        targetId: "name",
        // The Master's unpublished "Full name" is no business of a place's.
        label: en("name"),
        change: { kinds: ["hidden"], counts: {} },
        summary: "hidden",
        dependsOn: [],
        before: null,
        after: { asked: false },
    });
    assert.strictEqual(overrideRow(shows).placeId, "v1");
    assert.deepStrictEqual(overrideRow(shows).placeNames, ["Ladakh", "Village 1"]);
    // Its own wording is what the row is called.
    assert.deepStrictEqual(overrideRow(rewords).label, en("Age (Ladakh)"));
    assert.deepStrictEqual(overrideRow(narrows).change, {
        kinds: ["options"],
        counts: { hidden: 1, added: 1 },
    });
    assert.deepStrictEqual(overrideRow(resets).before, { label: en("B here") });
    assert.deepStrictEqual(overrideRow(resets).after, {});
    assert.strictEqual(overrideRow(hidesPage).targetType, "category");
    assert.deepStrictEqual(overrideRow(hidesPage).label, en("census"));

    // What a place added is listed as the Master's own additions are, under
    // that place …
    const ownQuestion = placeRow("question:ladakh-q");
    assert.strictEqual(ownQuestion.summary, "new question");
    assert.strictEqual(ownQuestion.placeId, "ladakh");
    assert.deepStrictEqual(ownQuestion.placeNames, ["Ladakh"]);
    assert.strictEqual(placeRow("category:ladakh-page").summary, "new category");
    // … and what another place set about it waits for it.
    assert.deepStrictEqual(overrideRow(hidesNew).dependsOn, ["question:ladakh-q"]);
    assert.deepStrictEqual(overrideRow(hidesNewPage).dependsOn, ["category:ladakh-page"]);

    // A new group and its field are one row while they are one place's; the
    // field Village 1 added to it is the village's own, and waits for it.
    assert.deepStrictEqual(ids(placeRow("question:l-group")), ["l-group", "l-field"]);
    const villageField = placeRow("question:v-field");
    assert.strictEqual(villageField.placeId, "v1");
    assert.strictEqual(villageField.summary, "new question");
    assert.deepStrictEqual(villageField.dependsOn, ["question:l-group"]);

    // Moved to another page, which is new and so has to go out first.
    const movedOut = placeRow("question:l-moved");
    assert.strictEqual(movedOut.summary, "moved");
    assert.deepStrictEqual(movedOut.before, { categoryId: "census" });
    assert.deepStrictEqual(movedOut.dependsOn, ["category:ladakh-page"]);

    // Every row is one of these two places', and none is the Master's …
    assert.strictEqual(new Set(placeRows.map((entry) => entry.key)).size, placeRows.length);
    placeRows.forEach((entry) =>
        assert.deepStrictEqual(entry.placeNames, ladakhAndBelow.get(entry.placeId))
    );
    assert.strictEqual(placeRow("question:name"), undefined);
    // 8 overrides, Ladakh's page and question, its group, its move, v1's field.
    assert.strictEqual(placeRows.length, 13);
    // … a village opened on its own lists its own four, named from there …
    assert.deepStrictEqual(
        pendingRows({
            categories,
            questions: placeQuestions,
            overrides: placeOverrides,
            places: new Map([["v1", ["Village 1"]]]),
        }).map((entry) => [entry.key, entry.placeNames]),
        [
            ["question:v-field", ["Village 1"]],
            [`override:${shows._id}`, ["Village 1"]],
            [`override:${hidesNew._id}`, ["Village 1"]],
            [`override:${hidesNewPage._id}`, ["Village 1"]],
        ]
    );
    // … and the Master's list is what it was, whatever places have drafted.
    assert.strictEqual(
        pendingRows({ categories, questions: placeQuestions, overrides: placeOverrides })
            .length,
        rows.length
    );

    /* ---- the two tree walks a publish relies on ---- */

    const tree = new Map([
        ["root", ""],
        ["mid", "root"],
        ["leaf", "mid"],
    ]);
    assert.deepStrictEqual(ancestors("leaf", tree), ["root", "mid"]);
    assert.deepStrictEqual(ancestors("root", tree), []);
    // A cycle ends; it does not hang.
    assert.deepStrictEqual(
        ancestors("x", new Map([["x", "y"], ["y", "x"]])),
        ["y"]
    );
    assert.deepStrictEqual(
        below("crops", questions, "parentQuestionId").map((doc) => doc._id),
        ["crop", "area"]
    );
    assert.deepStrictEqual(
        below("shelf", categories, "parentId").map((doc) => doc._id),
        ["nested"]
    );

    /* ---- what a publish does with those rows ---- */

    const sent = (type, id, docs = type === "question" ? questions : categories) => ({
        type,
        id,
        rev: docs.find((doc) => doc._id === id).rev || 0,
    });
    // `answeredIds` and `usedPages` stand in for the responses collection.
    const plan = (items, world = {}) =>
        planPublish({
            categories: world.categories || categories,
            questions: world.questions || questions,
            // Only a place's publish names places (and holds overrides).
            overrides: world.overrides,
            places: world.places,
            items,
            version: 7,
            actor: { _id: "admin-id", name: "Asha" },
            at: new Date(0),
            answered: async (found) =>
                found.some((id) => (world.answeredIds || []).includes(String(id))),
            hasResponses: async (id) =>
                (world.usedPages || []).includes(String(id)),
            usedOptions: async () => world.usedOptions || [],
        });
    const reasons = (result) => result.skipped.map((entry) => [entry.id, entry.reason]);
    const published = (id) => ({
        updateOne: {
            filter: { _id: id },
            update: { $unset: { unpublished: 1 }, $inc: { rev: 1 } },
        },
    });

    const publishChecks = async () => {
        // Edited since the dialog was opened, or gone: nothing is published.
        await assert.rejects(plan([{ type: "question", id: "name", rev: 0 }]), {
            statusCode: 409,
            message: STALE,
        });
        await assert.rejects(plan([{ type: "question", id: "nobody", rev: 0 }]), {
            statusCode: 409,
        });

        // A draft becomes the published fields, and stops being a draft.
        const one = await plan([sent("question", "name")]);
        assert.strictEqual(one.published, 1);
        assert.deepStrictEqual(one.skipped, []);
        assert.deepStrictEqual(one.ops, {
            category: [], // nothing moved: no path is rewritten
            question: [
                {
                    updateOne: {
                        filter: { _id: "name" },
                        update: {
                            $set: { label: en("Full name"), hasDraft: false },
                            $unset: { draft: 1 },
                            $inc: { rev: 1 },
                        },
                    },
                },
            ],
            response: [],
            override: [], // a Master edit touches nothing a place has set
        });
        assert.deepStrictEqual(one.history, [
            {
                version: 7,
                at: new Date(0),
                actorId: "admin-id",
                actorName: "Asha",
                placeId: null,
                placeNames: [],
                targetType: "question",
                targetId: "name",
                label: en("Full name"),
                change: { kinds: ["wording"], counts: {} },
                before: { label: en("name") },
                after: { label: en("Full name") },
                // What an undo goes by: the kind of row, and no row undone.
                source: "question",
                undoOf: null,
            },
        ]);

        // A question cannot go out before the new page it is on …
        const early = await plan([sent("question", "onnew")]);
        assert.strictEqual(early.published, 0);
        assert.deepStrictEqual(reasons(early), [["onnew", "Publish its page first."]]);
        assert.deepStrictEqual(early.ops, {
            category: [],
            question: [],
            response: [],
            override: [],
        });
        assert.deepStrictEqual(early.history, []);
        // … but goes with it, in whatever order they were sent.
        const together = await plan([
            sent("question", "onnew"),
            sent("category", "newpage"),
        ]);
        assert.strictEqual(together.published, 2);
        assert.deepStrictEqual(together.ops.category, [published("newpage")]);
        assert.deepStrictEqual(together.ops.question, [published("onnew")]);

        // Nor a field before its new group; with it, they are one change.
        assert.deepStrictEqual(reasons(await plan([sent("question", "crop")])), [
            ["crop", "Publish the question it sits in first."],
        ]);
        const group = await plan(
            ["crops", "crop", "area"].map((id) => sent("question", id))
        );
        assert.strictEqual(group.published, 1);
        assert.strictEqual(group.history.length, 1);
        assert.deepStrictEqual(
            group.ops.question,
            ["crops", "crop", "area"].map(published)
        );
        // An option removed in a draft that somebody has chosen since stays:
        // the row waits, and says why. Unchosen, it goes as drafted.
        const picker = q("picker", "census", {
            type: "single_select",
            options: [
                { value: "a", label: en("A") },
                { value: "b", label: en("B") },
            ],
        });
        const dropsB = [
            ...questions,
            {
                ...picker,
                ...draftUpdate(picker, { options: [picker.options[0]] }, "admin-id").$set,
            },
        ];
        const pickerItem = sent("question", "picker", dropsB);
        assert.deepStrictEqual(
            reasons(await plan([pickerItem], { questions: dropsB, usedOptions: ["b"] })),
            [["picker", "An option it removes has saved answers now. Archive it instead."]]
        );
        assert.strictEqual(
            (await plan([pickerItem], { questions: dropsB, usedOptions: ["a"] })).published,
            1
        );

        // Nor the inside of a new group without its middle: the group goes
        // out, the field waits for the section that was left behind.
        const layered = [
            ...questions,
            q("g1", "census", { unpublished: true, type: "repeatable_group" }),
            q("g2", "census", { unpublished: true, type: "section", parentQuestionId: "g1" }),
            q("g3", "census", { unpublished: true, parentQuestionId: "g2" }),
        ];
        const gap = await plan(
            ["g1", "g3"].map((id) => sent("question", id, layered)),
            { questions: layered }
        );
        assert.strictEqual(gap.published, 1);
        assert.deepStrictEqual(gap.ops.question, [published("g1")]);
        assert.deepStrictEqual(reasons(gap), [
            ["g3", "Publish the question it sits in first."],
        ]);
        assert.strictEqual(
            (
                await plan(
                    ["g1", "g2", "g3"].map((id) => sent("question", id, layered)),
                    { questions: layered }
                )
            ).published,
            1
        );

        // The same for a field of a question that is only becoming a group.
        const tallyItem = sent("question", "tally-item", becoming);
        assert.deepStrictEqual(
            reasons(await plan([tallyItem], { questions: becoming })),
            [["tally-item", "Publish the question it sits in first."]]
        );
        assert.strictEqual(
            (
                await plan([tallyItem, sent("question", "tally", becoming)], {
                    questions: becoming,
                })
            ).published,
            2
        );

        // Nor a category before the new category it is in — and what waits
        // on a skipped row is skipped with it.
        const deep = q("deep", "nested", { unpublished: true });
        const chain = await plan(
            [
                { type: "question", id: "deep", rev: 0 },
                sent("category", "nested"),
            ],
            { questions: [...questions, deep] }
        );
        assert.strictEqual(chain.published, 0);
        assert.deepStrictEqual(reasons(chain).sort(), [
            ["deep", "Publish its page first."],
            ["nested", "Publish the category it sits in first."],
        ]);

        // A replacement retires what it replaces, and says so in history.
        const swap = await plan([sent("question", "old-v2")]);
        assert.deepStrictEqual(swap.ops.question, [
            published("old-v2"),
            {
                updateOne: {
                    filter: { _id: "old" },
                    update: {
                        $set: { active: false, replacedBy: "old-v2" },
                        $inc: { rev: 1 },
                    },
                },
            },
        ]);
        assert.deepStrictEqual(swap.history[0].change, {
            kinds: ["new"],
            counts: {},
            replaces: en("Old"),
        });

        // A deletion drafted while nobody had answered is checked again:
        // answers that arrived since keep the question …
        const kept = await plan([sent("question", "gone")], { answeredIds: ["gone"] });
        assert.strictEqual(kept.published, 0);
        assert.deepStrictEqual(reasons(kept), [
            ["gone", "It has saved answers now. Archive it instead."],
        ]);
        // … and otherwise it goes, whatever else was drafted on it.
        const removed = await plan([sent("question", "gone")]);
        assert.deepStrictEqual(removed.ops.question, [
            { deleteMany: { filter: { _id: { $in: ["gone"] } } } },
            // What it had replaced can be given another replacement.
            {
                updateMany: {
                    filter: { replacedBy: { $in: ["gone"] } },
                    update: { $set: { replacedBy: null } },
                },
            },
        ]);
        assert.strictEqual(removed.history[0].after, null);
        // What places had set about it is not left pointing at nothing.
        assert.deepStrictEqual(removed.ops.override, [
            { deleteMany: { filter: { targetId: { $in: ["gone"] } } } },
        ]);
        // A group goes with everything under it, and an answer anywhere
        // under it keeps the lot.
        const herd = [
            edit(q("herd", "census", { type: "repeatable_group" }), { deleted: true }),
            q("cow", "census", { type: "section", parentQuestionId: "herd" }),
            q("milk", "census", { parentQuestionId: "cow" }),
        ];
        const withHerd = { questions: [...questions, ...herd] };
        const herdItem = [sent("question", "herd", herd)];
        assert.deepStrictEqual((await plan(herdItem, withHerd)).ops.question, [
            { deleteMany: { filter: { _id: { $in: ["herd", "cow", "milk"] } } } },
            {
                updateMany: {
                    filter: { replacedBy: { $in: ["herd", "cow", "milk"] } },
                    update: { $set: { replacedBy: null } },
                },
            },
        ]);
        assert.strictEqual(
            (await plan(herdItem, { ...withHerd, answeredIds: ["milk"] })).published,
            0
        );

        // The same for a change of answer type.
        const typed = [edit(q("count", "census"), { type: "number" })];
        const withTyped = { questions: [...questions, ...typed] };
        const typedItem = [sent("question", "count", typed)];
        assert.deepStrictEqual(
            reasons(await plan(typedItem, { ...withTyped, answeredIds: ["count"] })),
            [["count", TYPE_LOCKED]]
        );
        assert.deepStrictEqual(
            (await plan(typedItem, withTyped)).ops.question[0].updateOne.update.$set,
            { type: "number", hasDraft: false }
        );

        // Questions that only moved: each gets its order, history one line.
        const shuffle = await plan(["a", "b", "c"].map((id) => sent("question", id)));
        assert.strictEqual(shuffle.published, 1);
        assert.deepStrictEqual(
            shuffle.ops.question.map((op) => [
                op.updateOne.filter._id,
                op.updateOne.update.$set,
            ]),
            [
                ["a", { order: 3, hasDraft: false }],
                ["b", { order: 1, hasDraft: false }],
                ["c", { order: 2, hasDraft: false }],
            ]
        );
        assert.deepStrictEqual(shuffle.history[0].change.kinds, ["questions_reordered"]);
        assert.strictEqual(shuffle.history[0].targetId, "census");

        // A move rewrites the path of what moved, and of its responses.
        assert.deepStrictEqual(reasons(await plan([sent("category", "farm")])), [
            ["farm", "Publish the category it sits in first."],
        ]);
        const move = await plan([sent("category", "farm"), sent("category", "shelf")]);
        assert.strictEqual(move.published, 2);
        assert.deepStrictEqual(move.ops.category, [
            published("shelf"),
            {
                updateOne: {
                    filter: { _id: "farm" },
                    update: {
                        $set: { parentId: "shelf", hasDraft: false },
                        $unset: { draft: 1 },
                        $inc: { rev: 1 },
                    },
                },
            },
            {
                updateOne: {
                    filter: { _id: "farm" },
                    update: { $set: { path: ["shelf"], depth: 1 } },
                },
            },
        ]);
        assert.deepStrictEqual(move.ops.response, [
            {
                updateMany: {
                    filter: { categoryId: "farm" },
                    update: { $set: { categoryPath: ["shelf", "farm"] } },
                    timestamps: false,
                },
            },
        ]);

        // Two moves that are only sound together: `low` (inside `high`) goes
        // to the top, and `high` goes inside `low`.
        const swapTree = [
            edit(cat("high", { is_screen: false }), { parentId: "low" }),
            edit(cat("low", { parentId: "high", path: ["high"], depth: 1 }), {
                parentId: null,
            }),
            cat("leaf", { parentId: "low", path: ["high", "low"], depth: 2 }),
        ];
        const inTree = { categories: swapTree, questions: [] };
        // Alone, `high` would end up inside itself: it stays behind.
        const half = await plan([sent("category", "high", swapTree)], inTree);
        assert.strictEqual(half.published, 0);
        assert.strictEqual(half.skipped[0].id, "high");
        assert.match(half.skipped[0].reason, /inside itself/);
        // Together they go, whichever is looked at first, and every path
        // below follows — the untouched `leaf` and its responses included.
        for (const order of [["high", "low"], ["low", "high"]]) {
            const both = await plan(
                order.map((id) => sent("category", id, swapTree)),
                {
                    categories: [...order, "leaf"].map((id) =>
                        swapTree.find((doc) => doc._id === id)
                    ),
                    questions: [],
                }
            );
            assert.strictEqual(both.published, 2);
            const paths = Object.fromEntries(
                both.ops.category
                    .filter((op) => op.updateOne.update.$set.path)
                    .map((op) => [op.updateOne.filter._id, op.updateOne.update.$set])
            );
            assert.deepStrictEqual(paths, {
                high: { path: ["low"], depth: 1 },
                low: { path: [], depth: 0 },
                leaf: { path: ["low"], depth: 1 },
            });
            assert.deepStrictEqual(
                both.ops.response.map((op) => [
                    op.updateMany.filter.categoryId,
                    op.updateMany.update.$set.categoryPath,
                ]),
                [
                    ["low", ["low"]],
                    ["leaf", ["low", "leaf"]],
                ]
            );
        }

        // A category is deleted only while it is still empty: no category,
        // question or response under it, and none on its way in.
        const doomed = [
            edit(cat("doomed"), { deleted: true }),
            cat("other"),
        ];
        const doomedItem = [sent("category", "doomed", doomed)];
        const empty = await plan(doomedItem, { categories: doomed, questions: [] });
        assert.deepStrictEqual(empty.ops.category, [
            { deleteMany: { filter: { _id: { $in: ["doomed"] } } } },
        ]);
        for (const world of [
            { categories: doomed, questions: [q("late", "doomed", { unpublished: true })] },
            { categories: doomed, questions: [], usedPages: ["doomed"] },
            {
                categories: [doomed[0], cat("child", { parentId: "doomed" })],
                questions: [],
            },
            {
                categories: [doomed[0], edit(cat("mover"), { parentId: "doomed" })],
                questions: [],
            },
        ]) {
            assert.deepStrictEqual(reasons(await plan(doomedItem, world)), [
                ["doomed", "It is not empty any more. Archive it instead."],
            ]);
        }

        // Nothing pending on what was sent: nothing to do, and no error.
        const idle = await plan([sent("question", "untouched")]);
        assert.deepStrictEqual(
            [idle.published, idle.skipped, idle.history],
            [0, [], []]
        );

        /* ---- a place's publish: Ladakh, with Village 1 inside it ---- */

        const inLadakh = {
            questions: placeQuestions,
            overrides: placeOverrides,
            places: ladakhAndBelow,
        };
        const item = (override) => ({
            type: "override",
            id: override._id,
            rev: override.rev,
        });
        const own = (id) => sent("question", id, placeQuestions);
        const refused = { statusCode: 403, message: "This place is not yours." };

        // An override's draft becomes what the place has set …
        const hid = await plan([item(hides)], inLadakh);
        assert.strictEqual(hid.published, 1);
        assert.deepStrictEqual(hid.ops, {
            category: [],
            question: [],
            response: [],
            override: [
                {
                    updateOne: {
                        filter: { _id: hides._id },
                        update: {
                            $set: { published: { asked: false }, hasDraft: false },
                            $unset: { draft: 1 },
                            $inc: { rev: 1 },
                        },
                    },
                },
            ],
        });
        // … and history files it under that place, about the question.
        assert.deepStrictEqual(hid.history, [
            {
                version: 7,
                at: new Date(0),
                actorId: "admin-id",
                actorName: "Asha",
                placeId: "ladakh",
                placeNames: ["Ladakh"],
                targetType: "question",
                targetId: "name",
                label: en("name"),
                change: { kinds: ["hidden"], counts: {} },
                before: null,
                after: { asked: false },
                source: "override",
                undoOf: null,
            },
        ]);

        // With nothing left in it, the document goes rather than staying empty.
        const cleared = await plan([item(resets)], inLadakh);
        assert.deepStrictEqual(cleared.ops.override, [
            { deleteOne: { filter: { _id: resets._id } } },
        ]);
        assert.deepStrictEqual(cleared.history[0].change.kinds, ["reset"]);

        // Edited since the dialog was opened: nothing is published.
        await assert.rejects(plan([{ ...item(hides), rev: 0 }], inLadakh), {
            statusCode: 409,
            message: STALE,
        });

        // A publish opened on Village 1 covers that village alone: Ladakh's
        // change is not its to publish, and nor is the Master's — for
        // either place.
        const inVillage = { ...inLadakh, places: new Map([["v1", ["Ladakh", "Village 1"]]]) };
        assert.strictEqual((await plan([item(shows)], inVillage)).published, 1);
        await assert.rejects(plan([item(shows), item(hides)], inVillage), refused);
        await assert.rejects(plan([own("ladakh-q")], inVillage), refused);
        await assert.rejects(plan([own("name")], inVillage), refused);
        await assert.rejects(plan([own("name")], inLadakh), refused);
        // And the Master's publish leaves a place's work where it is.
        const fromMaster = await plan([item(hides), own("ladakh-q")], {
            ...inLadakh,
            places: undefined,
        });
        assert.deepStrictEqual(
            [fromMaster.published, fromMaster.skipped, fromMaster.history],
            [0, [], []]
        );

        // What a place added goes out as the Master's additions do, under
        // that place's name.
        const ownNew = await plan([own("ladakh-q")], inLadakh);
        assert.deepStrictEqual(ownNew.ops.question, [published("ladakh-q")]);
        assert.strictEqual(ownNew.history[0].placeId, "ladakh");
        assert.deepStrictEqual(ownNew.history[0].change.kinds, ["new"]);
        // What another place set about it waits for it …
        const tooEarly = await plan([item(hidesNew)], inLadakh);
        assert.strictEqual(tooEarly.published, 0);
        assert.deepStrictEqual(tooEarly.skipped, [
            {
                type: "override",
                id: hidesNew._id,
                reason: "Publish the new question or category it changes first.",
            },
        ]);
        // … and goes with it, each under its own place.
        const withIt = await plan([item(hidesNew), own("ladakh-q")], inLadakh);
        assert.strictEqual(withIt.published, 2);
        assert.deepStrictEqual(
            withIt.history.map((entry) => [entry.placeId, entry.placeNames]),
            [
                ["ladakh", ["Ladakh"]],
                ["v1", ["Ladakh", "Village 1"]],
            ]
        );
        // The village's field cannot go out before the state's new group.
        assert.deepStrictEqual(reasons(await plan([own("v-field")], inLadakh)), [
            ["v-field", "Publish the question it sits in first."],
        ]);
        assert.strictEqual(
            (await plan(["v-field", "l-group", "l-field"].map(own), inLadakh)).published,
            2
        );

        // A question moved to a new page goes with the page, and takes what
        // is inside it along: every question carries its page.
        assert.deepStrictEqual(reasons(await plan([own("l-moved")], inLadakh)), [
            ["l-moved", "Publish its page first."],
        ]);
        const newPage = sent("category", "ladakh-page");
        const relocated = await plan([own("l-moved"), newPage], inLadakh);
        assert.strictEqual(relocated.published, 2);
        assert.deepStrictEqual(relocated.ops.question, [
            {
                updateOne: {
                    filter: { _id: "l-moved" },
                    update: {
                        $set: { categoryId: "ladakh-page", hasDraft: false },
                        $unset: { draft: 1 },
                        $inc: { rev: 1 },
                    },
                },
            },
            {
                updateMany: {
                    filter: { _id: { $in: ["l-moved-field"] } },
                    update: { $set: { categoryId: "ladakh-page" } },
                },
            },
        ]);
        // Answered in the meantime — it or anything in it — it stays put.
        assert.deepStrictEqual(
            reasons(
                await plan([own("l-moved"), newPage], {
                    ...inLadakh,
                    answeredIds: ["l-moved-field"],
                })
            ),
            [["l-moved", "It has saved answers now, so it stays on its page."]]
        );
    };

    publishChecks().then(
        () => console.log("changeSummary: all checks passed"),
        (error) => {
            console.error(error);
            process.exit(1);
        }
    );
}
