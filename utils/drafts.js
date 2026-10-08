const { isDeepStrictEqual } = require("util");
const mongoose = require("mongoose");
const Questions = require("../Models/questions");
const Categories = require("../Models/categories");
const PlaceOverrides = require("../Models/placeOverrides");
const AppError = require("../AppError");
const { DEFAULT_LANGUAGE, normaliseLocalised } = require("./localised");
const { pendingRows } = require("./changeSummary");

/**
 * Editing the questionnaire without the app seeing it, for questions and
 * categories alike: how a draft is written, and how it ends.
 *
 * A document that was never published (`unpublished: true`) is itself the
 * draft: an edit simply writes its fields. A published document is never
 * edited in place: the edit goes into `draft`, a patch holding only the fields
 * that differ from what is published, and stays there until a publish applies
 * it (planPublish below, run by Controllers/questionnaire.js). The app reads
 * through utils/effectiveQuestionnaire.js with no drafts, so it sees neither.
 *
 * What a PLACE changes about a question or category it does not own is not a
 * draft on that document but an override of its own
 * (Models/placeOverrides.js), with the same life: overrideUpdate writes it,
 * planPublish puts it out.
 *
 * draftUpdate, overrideUpdate, planPublish and the two tree walks read and
 * write nothing, and are checked without a database by
 * `node utils/changeSummary.js` — which writes its fixtures through
 * draftUpdate and overrideUpdate and publishes them through planPublish.
 */
const CONFLICT =
    "This was changed by someone else. The screen has been reloaded.";
const STALE =
    "Some changes were edited after you opened this list. It has been reloaded.";
const TYPE_LOCKED =
    "The answer type is locked because answers are already saved.";
// For what a place added itself. Archiving is the Master's way of taking a
// question out of every place; a place has its own switch for that, and the
// same goes for its categories. (Something it has not published yet can
// still be deleted: that is a discard.)
const PLACE_CANNOT_ARCHIVE =
    "A place hides a question with its switch; it cannot archive or delete one.";

/**
 * A projection for the list that shows only what is published (GET
 * /categories). It is read by regional accounts too, and a draft is the
 * Master editor's unfinished work, so none of it goes out.
 */
const WITHOUT_DRAFT = { draft: 0, hasDraft: 0, rev: 0, draftBy: 0, draftAt: 0 };

/** The document as the editor shows it: its draft laid over what is published. */
const applied = (doc) =>
    doc.hasDraft && doc.draft ? { ...doc, ...doc.draft } : doc;

/**
 * A value in the one form two copies of it can be compared in. Ids and dates
 * become what they say (a draft holds what the dashboard sent, a document what
 * Mongo stored), an option with no `archived` is one that is not archived, and
 * `{}`, `[]`, null and a missing field are all "nothing here".
 */
const comparable = (key, value) => {
    const shaped =
        key === "options"
            ? (value || []).map((option) => ({
                  value: option.value,
                  label: option.label,
                  archived: Boolean(option.archived),
              }))
            : value;
    const plain =
        shaped === undefined ? null : JSON.parse(JSON.stringify(shaped));
    return plain !== null &&
        typeof plain === "object" &&
        Object.keys(plain).length === 0
        ? null
        : plain;
};

const sameValue = (key, a, b) =>
    isDeepStrictEqual(comparable(key, a), comparable(key, b));

/**
 * The Mongo update for one edit. Pure: nothing is read or written here.
 *
 * `patch` holds the fields the edit sets; `null` drops the whole draft (a
 * discard). A field set back to its published value leaves the draft, and a
 * draft with nothing left is removed rather than stored empty.
 */
const draftUpdate = (doc, patch, adminId) => {
    const stamp = { draftBy: adminId, draftAt: new Date() };

    // Never published: there is nothing to protect, the fields are written.
    if (doc.unpublished) {
        return { $set: { ...patch, ...stamp }, $inc: { rev: 1 } };
    }

    const draft =
        patch === null
            ? {}
            : { ...(doc.hasDraft && doc.draft ? doc.draft : {}), ...patch };
    Object.keys(draft).forEach((key) => {
        if (sameValue(key, draft[key], doc[key])) delete draft[key];
    });

    return Object.keys(draft).length > 0
        ? { $set: { draft, hasDraft: true, ...stamp }, $inc: { rev: 1 } }
        : {
              $set: { hasDraft: false, ...stamp },
              $unset: { draft: 1 },
              $inc: { rev: 1 },
          };
};

/** A document saved before `rev` existed has none, and counts as 0. */
const revFilter = (rev) => (rev === 0 ? { rev: { $in: [0, null] } } : { rev });

/** For a write that is not a draft write (a delete, a discard). */
const assertRev = (doc, rev) => {
    if (rev !== undefined && rev !== (doc.rev || 0)) {
        throw new AppError(0, CONFLICT, 409);
    }
};

/**
 * Writes one edit and answers `{ _id, rev }`.
 *
 * The write only lands on the revision the caller was shown. When the caller
 * sent none, it lands on the one read a moment ago, so a write that slipped
 * in between is refused rather than overwritten blind.
 */
const writeDraft = async (Model, doc, rev, patch, adminId) => {
    const saved = await Model.findOneAndUpdate(
        { _id: doc._id, ...revFilter(rev ?? doc.rev ?? 0) },
        draftUpdate(doc, patch, adminId),
        { new: true }
    )
        .select({ rev: 1 })
        .lean();
    if (!saved) throw new AppError(0, CONFLICT, 409);
    return { _id: saved._id, rev: saved.rev };
};

/**
 * Drafts a new `order` on each of `pairs` (`[{ id, order }]`). No rev is
 * asked for: order is last-write-wins.
 */
const writeOrder = async (Model, pairs, adminId) => {
    const docs = await Model.find({
        _id: { $in: pairs.map((pair) => pair.id) },
        // Only the Master can be reordered. What a place added sits after
        // it and stays there, so one sent here is passed over like an id
        // that matches nothing.
        ownerPlaceId: null,
    }).lean();
    const byId = new Map(docs.map((doc) => [String(doc._id), doc]));

    const writes = pairs.flatMap(({ id, order }) => {
        const doc = byId.get(String(id).toLowerCase());
        // What does not move is not written: its rev stays put, so someone
        // with that question open is not told it changed under them.
        if (!doc || applied(doc).order === order) return [];
        return [
            {
                updateOne: {
                    // As in writeDraft: an edit that landed since the read
                    // wins, and this one item keeps its old position.
                    filter: { _id: doc._id, ...revFilter(doc.rev ?? 0) },
                    update: draftUpdate(doc, { order }, adminId),
                },
            },
        ];
    });
    if (writes.length > 0) await Model.bulkWrite(writes);
};

/**
 * The ids above `id`, root first, in a tree given as id → parent id (both
 * strings). Stops at a repeat, so a cycle cannot hang it.
 */
const ancestors = (id, parentOf) => {
    const path = [];
    const seen = new Set([String(id)]);
    let current = parentOf.get(String(id));
    while (current && !seen.has(current)) {
        seen.add(current);
        path.unshift(current);
        current = parentOf.get(current);
    }
    return path;
};

/** Every document under `rootId`, nearest first. `parentField` names the link. */
const below = (rootId, docs, parentField) => {
    const out = [];
    const seen = new Set([String(rootId)]);
    let level = [String(rootId)];
    while (level.length > 0) {
        const children = docs.filter(
            (doc) =>
                level.includes(String(doc[parentField])) &&
                !seen.has(String(doc._id))
        );
        children.forEach((doc) => seen.add(String(doc._id)));
        out.push(...children);
        level = children.map((doc) => String(doc._id));
    }
    return out;
};

/**
 * A draft is Mixed, so the schema's own "needs English" check never sees it.
 * This is that check, for wording on its way into a draft.
 */
const requiredText = (value, name) => {
    const text = normaliseLocalised(value);
    if (!text || !text[DEFAULT_LANGUAGE]) {
        throw new AppError(0, `${name} needs English text`, 400);
    }
    return text;
};

/* ------------------------------------------------------------------ */
/* What a place changed (Models/placeOverrides.js)                     */
/* ------------------------------------------------------------------ */

const STATE_KEYS = ["asked", "label", "helper_text", "options", "addedOptions"];

/** Two values of a state, compared as stored. `asked: false` is a value. */
const sameState = (a, b) => sameValue("", a, b);

/**
 * A state as it is stored: only the keys that say something. null, {} and
 * [] say nothing, so "this place set nothing" is always the absence of a key
 * and never an empty one.
 */
const cleanState = (state) =>
    Object.fromEntries(
        STATE_KEYS.filter((key) => !sameState(state?.[key], null)).map(
            (key) => [key, state[key]]
        )
    );

/**
 * The key of an option a place adds. Issued here so that it can never be a
 * Master key: those may not start with "p_" (Controllers/questions.js).
 */
const placeOptionKey = () => `p_${new mongoose.Types.ObjectId()}`;

/**
 * What one change does to one override. Pure: nothing is read or written.
 *
 * `patch` is merged into the override's current state — its draft if it has
 * one, else what is published, else nothing. A key with a value sets it, a
 * key with `null` takes it back; `options` and `addedOptions` are each the
 * whole next list. `patch === null` drops the draft (a discard).
 *
 * Then whatever the patch SET that changes nothing is dropped, measured
 * against `inherited`: what the place gets WITHOUT this override —
 * `{ asked, label, helper_text, options: [{ value, asked, archived }] }`,
 * i.e. the resolver's answer with this place's own override left out. A
 * switch set to what it already is, wording equal to the wording above, an
 * option "hidden" that is not offered anyway: none of it is kept, so a
 * place that puts everything back is left with no override at all.
 *
 * Two things are deliberately NOT dropped, because dropping them would
 * itself be a change nobody asked for:
 *   - what the patch leaves alone. A key drafted earlier may have become
 *     redundant since — a place above set the same, perhaps only in a draft
 *     of its own that is discarded tomorrow — and that is not this save's
 *     to remove;
 *   - a value that is already PUBLISHED that way, set again. Its removal
 *     would be listed as "hidden" or "reset to the Master version".
 *
 * @returns `{ action, state, update }`. `action` is "none" (nothing to
 *          write), "draft" (store `state` as the draft), "clear" (the state
 *          is what is published again: drop the draft) or "delete" (nothing
 *          set and nothing published: no document). `update` is the Mongo
 *          update for "draft" and "clear".
 */
const overrideUpdate = (
    override,
    patch,
    inherited = {},
    adminId,
    newKey = placeOptionKey
) => {
    const published = cleanState(override?.published);
    const current = override?.hasDraft
        ? cleanState(override.draft)
        : published;

    let next = published;
    if (patch !== null) {
        next = { ...current };
        // A `null` goes in like any value and is taken out by cleanState
        // below with everything else that says nothing.
        const set = (key) => patch[key] !== undefined;
        STATE_KEYS.filter(set).forEach((key) => {
            next[key] = patch[key];
        });

        // An option the place adds is keyed once and keeps that key on
        // every later save: answers are stored under it. A key that is SENT
        // has to be one this override issued, or a place could lay claim to
        // a Master option's.
        const issued = [
            ...(current.addedOptions || []),
            ...(published.addedOptions || []),
        ].map((option) => option.value);
        next.addedOptions = (next.addedOptions || []).map((option) => {
            if (option.value !== undefined && !issued.includes(option.value)) {
                throw new AppError(
                    0,
                    `“${option.value}” is not an option this place added`,
                    400
                );
            }
            return {
                value: option.value ?? newKey(),
                label: option.label,
                ...(option.archived ? { archived: true } : {}),
            };
        });

        ["asked", "label", "helper_text"].filter(set).forEach((key) => {
            const changesNothing = sameState(next[key], inherited[key]);
            const alreadyOut = sameState(next[key], published[key]);
            if (changesNothing && !alreadyOut) delete next[key];
        });

        if (set("options")) {
            // An option is switched off or on only where that differs from
            // how the place gets it — the same test the resolver makes
            // before it counts one as changed. The place's own added
            // options are on offer here too, which `inherited` cannot know.
            const offered = [
                ...(inherited.options || []),
                ...next.addedOptions.map((option) => ({
                    value: option.value,
                    archived: Boolean(option.archived),
                    asked: !option.archived,
                })),
            ];
            next.options = (next.options || [])
                .filter(({ value, asked }) => {
                    const option = offered.find((o) => o.value === value);
                    return (
                        (option && !option.archived && option.asked !== asked) ||
                        (published.options || []).some(
                            (o) => o.value === value && o.asked === asked
                        )
                    );
                })
                .map(({ value, asked }) => ({ value, asked }))
                // In one order, so the same switches always compare equal.
                .sort((a, b) =>
                    a.value < b.value ? -1 : a.value > b.value ? 1 : 0
                );
        }

        next = cleanState(next);
    }

    const result = (action, update) => ({ action, state: next, update });
    const stamp = { draftBy: adminId, draftAt: new Date() };
    const asPublished = sameState(next, published);

    // Nothing drafted and nothing to draft, or the draft already says this.
    if (!override?.hasDraft && asPublished) return result("none");
    if (override?.hasDraft && patch !== null && sameState(next, current)) {
        return result("none");
    }
    if (!asPublished) {
        return result("draft", {
            $set: { draft: next, hasDraft: true, ...stamp },
            $inc: { rev: 1 },
        });
    }
    // Back to what is published. With nothing published either, the place
    // takes everything from above again and there is nothing to keep.
    return Object.keys(published).length === 0
        ? result("delete")
        : result("clear", {
              $set: { hasDraft: false, ...stamp },
              $unset: { draft: 1 },
              $inc: { rev: 1 },
          });
};

/**
 * Carries out what overrideUpdate decided and answers the override's new
 * rev (0 when there is no document). `identity` is
 * `{ placeId, targetType, targetId }`, for the first change a place makes to
 * a target. As in writeDraft, the write lands only on the revision that was
 * read (or sent).
 */
const writeOverride = async (override, identity, { action, update }, rev) => {
    if (action === "none") return override?.rev || 0;

    if (!override) {
        const created = await PlaceOverrides.create({
            ...identity,
            ...update.$set,
            // Not 0: that is "no document", which is what someone who has
            // not seen this one yet would send.
            rev: 1,
        }).catch((error) => {
            // Two people making a place's first change to the same question.
            throw error?.code === 11000 ? new AppError(0, CONFLICT, 409) : error;
        });
        return created.rev;
    }

    const filter = { _id: override._id, ...revFilter(rev ?? override.rev ?? 0) };
    if (action === "delete") {
        const { deletedCount } = await PlaceOverrides.deleteOne(filter);
        if (deletedCount === 0) throw new AppError(0, CONFLICT, 409);
        return 0;
    }
    const saved = await PlaceOverrides.findOneAndUpdate(filter, update, {
        new: true,
    })
        .select({ rev: 1 })
        .lean();
    if (!saved) throw new AppError(0, CONFLICT, 409);
    return saved.rev;
};

/**
 * What publishing `items` does: which rows go out, which are skipped and why,
 * the writes per collection, and the history. Worked out from what it is
 * handed and nothing else, so the same documents always give the same plan —
 * a publish runs in a transaction, and the driver may run that twice.
 *
 * A row goes out only with (or after) the rows it depends on, and only if
 * nothing has locked it since it was drafted: an edit was checked when it was
 * made, but a draft can wait for days while answers keep arriving.
 *
 * @param categories   every lean category as stored (drafts not applied)
 * @param questions    every lean question, the same
 * @param overrides    the lean place_overrides documents among `items`
 * @param items        `[{ type, id, rev }]` as the Publish dialog sent them;
 *                     `type` is "question", "category" or "override"
 * @param places       left out for a publish of the Master. For a place's
 *                     publish, Map of every place it covers — that place and
 *                     the places inside it — to the names that lead to it,
 *                     which history keeps
 * @param version      the version this publish will be
 * @param actor        the account publishing: `{ _id, name }`
 * @param at           when
 * @param undoOf       the history row this publish takes back, if it is an
 *                     undo: kept on the rows it writes
 * @param answered     async (questionIds) => does a response answer any of them
 * @param hasResponses async (categoryId) => is a response saved for that page
 * @param usedOptions  async (questionId) => the option keys its answers hold
 * @returns {{ published: number, skipped: object[], ops: object, history: object[] }}
 *          `published` counts rows, `skipped` is `{ type, id, reason }` per
 *          item, `ops` holds bulkWrite operations per collection.
 * @throws 409 when something sent is no longer the revision that was sent;
 *         403 when a place's publish is sent something another place owns
 */
const planPublish = async ({
    categories,
    questions,
    overrides = [],
    items,
    places,
    version,
    actor,
    at,
    undoOf = null,
    answered,
    hasResponses,
    usedOptions = async () => [],
}) => {
    const stored = new Map([
        ...categories.map((doc) => [`category:${doc._id}`, doc]),
        ...questions.map((doc) => [`question:${doc._id}`, doc]),
        ...overrides.map((doc) => [`override:${doc._id}`, doc]),
    ]);
    const docOf = (item) => stored.get(`${item.type}:${item.id}`);

    items.forEach((item) => {
        const doc = docOf(item);
        // A place publishes its own work and that of the places inside it,
        // nothing else — judged by the place on the document itself. That
        // rules out the Master's documents too. (A Master publish sent a
        // place's work simply finds no row for it below.)
        const owner =
            doc && (item.type === "override" ? doc.placeId : doc.ownerPlaceId);
        if (doc && places && !(owner && places.has(String(owner)))) {
            throw new AppError(0, "This place is not yours.", 403);
        }
        // One stale item stops the whole publish: the list that was approved
        // is not the list any more.
        if (!doc || (doc.rev || 0) !== item.rev) {
            throw new AppError(0, STALE, 409);
        }
    });

    // The rows the dialog showed, made of the documents that were sent.
    const rows = pendingRows({
        categories,
        questions,
        overrides,
        places,
        only: new Set(items.map((item) => `${item.type}:${item.id}`)),
    });
    const rowOf = new Map(rows.map((row) => [row.key, row]));

    const skipped = [];
    const skip = (row, reason) => {
        row.items.forEach(({ type, id }) => skipped.push({ type, id, reason }));
        return false;
    };

    // The category tree as it will be published: what is stored, then each
    // move and each deletion as it is accepted below.
    const parentOf = new Map(
        categories.map((category) => [
            String(category._id),
            String(category.parentId || ""),
        ])
    );
    const moves = [];
    const draftOf = (doc) =>
        (!doc.unpublished && doc.hasDraft && doc.draft) || {};

    /** Why a row can no longer go out, or null. */
    const lockOn = async (row) => {
        for (const item of row.items) {
            // What a place set about a question takes nothing away from the
            // answers saved on it, so nothing can have locked it since.
            if (item.type === "override") continue;

            const doc = docOf(item);
            const draft = draftOf(doc);
            const id = String(doc._id);

            // Moved to another page, the answers it has would stay behind on
            // the old one (a response is one page's).
            if (
                item.type === "question" &&
                draft.categoryId !== undefined &&
                !draft.deleted
            ) {
                const inside = below(doc._id, questions, "parentQuestionId");
                if (await answered([doc, ...inside].map((q) => q._id))) {
                    return "It has saved answers now, so it stays on its page.";
                }
            }

            // An option the draft removes was nobody's answer when it was
            // drafted. Somebody may have chosen it since: it then stays (the
            // editor archives it instead). Its own test, not another arm
            // below: one draft can change the options and the type.
            if (
                item.type === "question" &&
                draft.options !== undefined &&
                !draft.deleted
            ) {
                const kept = new Set(
                    draft.options.map((option) => String(option.value))
                );
                const removed = (doc.options || [])
                    .map((option) => String(option.value))
                    .filter((key) => !kept.has(key));
                if (removed.length > 0) {
                    const used = (await usedOptions(doc._id)).map(String);
                    if (removed.some((key) => used.includes(key))) {
                        return "An option it removes has saved answers now. Archive it instead.";
                    }
                }
            }

            if (item.type === "question" && draft.deleted) {
                const inside = below(doc._id, questions, "parentQuestionId");
                if (await answered([doc, ...inside].map((q) => q._id))) {
                    return "It has saved answers now. Archive it instead.";
                }
            } else if (
                item.type === "question" &&
                draft.type !== undefined &&
                draft.type !== doc.type
            ) {
                if (await answered([doc._id])) return TYPE_LOCKED;
            } else if (item.type === "category" && draft.deleted) {
                // Empty means nothing under it now and nothing on its way in:
                // a category drafted to move here — or a place's question
                // drafted to move onto it — would be left pointing at nothing.
                const inUse =
                    categories.some(
                        (other) =>
                            String(other.parentId) === id ||
                            String(draftOf(other).parentId) === id
                    ) ||
                    questions.some(
                        (other) =>
                            String(other.categoryId) === id ||
                            String(draftOf(other).categoryId) === id
                    ) ||
                    (await hasResponses(doc._id));
                if (inUse) return "It is not empty any more. Archive it instead.";
                parentOf.delete(id);
            } else if (item.type === "category" && draft.parentId !== undefined) {
                moves.push({ row, id, from: parentOf.get(id) });
                parentOf.set(id, String(draft.parentId || ""));
            }
        }
        return null;
    };

    // A question published before its new page, or a field before its new
    // group, would be a published document under something the app cannot
    // see — and one a later discard of that page or group would orphan.
    const going = new Map();
    const decide = async (row) => {
        if (going.has(row.key)) return going.get(row.key);
        going.set(row.key, false); // rows waiting on each other end here
        for (const key of row.dependsOn) {
            const needed = rowOf.get(key);
            if (needed && (await decide(needed))) continue;
            // What a place set about something new: the app cannot hide or
            // reword what it has not been given yet.
            if (row.key.startsWith("override:")) {
                return skip(
                    row,
                    "Publish the new question or category it changes first."
                );
            }
            if (key.startsWith("question:")) {
                return skip(row, "Publish the question it sits in first.");
            }
            return skip(
                row,
                row.key.startsWith("question:")
                    ? "Publish its page first."
                    : "Publish the category it sits in first."
            );
        }
        const lock = await lockOn(row);
        if (lock) return skip(row, lock);
        going.set(row.key, true);
        return true;
    };
    for (const row of rows) await decide(row);

    // A move was checked when it was drafted, against the tree with EVERY
    // draft applied. Published without a move it relied on, it can put a
    // category inside itself. Such a move stays behind — judged only now,
    // with every accepted move in place, so the order they came in does not
    // decide anything.
    const insideItself = (id) => {
        const seen = new Set();
        let current = parentOf.get(id);
        while (current && !seen.has(current)) {
            if (current === id) return true;
            seen.add(current);
            current = parentOf.get(current);
        }
        return false;
    };
    for (;;) {
        const looped = moves.find(
            (move) => going.get(move.row.key) && insideItself(move.id)
        );
        if (!looped) break;
        parentOf.set(looped.id, looped.from);
        going.set(looped.row.key, false);
        skip(
            looped.row,
            "This move would put the category inside itself. Publish the other category moves with it."
        );
    }

    const publishing = rows.filter((row) => going.get(row.key));
    const ops = { category: [], question: [], response: [], override: [] };
    const history = [];
    if (publishing.length === 0) return { published: 0, skipped, ops, history };

    publishing.forEach((row) => {
        row.items.forEach((item) => {
            const doc = docOf(item);
            const filter = { _id: doc._id };

            if (item.type === "override") {
                // The whole next state becomes what the place has set. With
                // nothing left in it the place takes everything from above
                // again, and the document has no reason to stay.
                const state = cleanState(doc.draft);
                ops.override.push(
                    Object.keys(state).length === 0
                        ? { deleteOne: { filter } }
                        : {
                              updateOne: {
                                  filter,
                                  update: {
                                      $set: { published: state, hasDraft: false },
                                      $unset: { draft: 1 },
                                      $inc: { rev: 1 },
                                  },
                              },
                          }
                );
                return;
            }

            if (doc.unpublished) {
                ops[item.type].push({
                    updateOne: {
                        filter,
                        update: { $unset: { unpublished: 1 }, $inc: { rev: 1 } },
                    },
                });
                // A replacement retires what it replaces in the same breath:
                // the app stops asking the old question the moment it starts
                // asking the new one, and the answers stay on the old id.
                if (doc.replaces) {
                    ops.question.push({
                        updateOne: {
                            filter: { _id: doc.replaces },
                            update: {
                                $set: { active: false, replacedBy: doc._id },
                                $inc: { rev: 1 },
                            },
                        },
                    });
                }
                return;
            }

            const { deleted, ...fields } = doc.draft;
            if (deleted) {
                // A question goes with everything under it; a category was
                // checked to have nothing under it.
                const inside =
                    item.type === "question"
                        ? below(doc._id, questions, "parentQuestionId")
                        : [];
                const ids = [doc, ...inside].map((d) => d._id);
                ops[item.type].push({
                    deleteMany: { filter: { _id: { $in: ids } } },
                });
                // What places had set about them would point at nothing.
                ops.override.push({
                    deleteMany: { filter: { targetId: { $in: ids } } },
                });
                return;
            }
            ops[item.type].push({
                updateOne: {
                    filter,
                    update: {
                        $set: { ...fields, hasDraft: false },
                        $unset: { draft: 1 },
                        $inc: { rev: 1 },
                    },
                },
            });
            // A question's page is kept on everything inside it as well, so
            // that one read returns a whole page: it all moves together.
            const inside =
                item.type === "question" && fields.categoryId !== undefined
                    ? below(doc._id, questions, "parentQuestionId")
                    : [];
            if (inside.length > 0) {
                ops.question.push({
                    updateMany: {
                        filter: { _id: { $in: inside.map((d) => d._id) } },
                        update: { $set: { categoryId: fields.categoryId } },
                    },
                });
            }
        });

        // One line of history per row, saying what the dialog said.
        history.push({
            version,
            at,
            actorId: actor._id,
            actorName: actor.name,
            placeId: row.placeId,
            placeNames: row.placeNames,
            targetType: row.targetType,
            targetId: row.targetId,
            label: row.label,
            change: row.change,
            before: row.before,
            after: row.after,
            // "question:<id>", "override:<id>", "order:<page>" ...
            source: row.key.split(":")[0],
            undoOf,
        });
    });

    // `path` and `depth` follow the tree as it is now published. They are
    // worked out afresh for every category rather than patched per move: two
    // moves in one publish, or a new category under a moved one, would
    // otherwise depend on the order they were applied in.
    categories.forEach((category) => {
        const id = String(category._id);
        if (!parentOf.has(id)) return; // deleted just above
        const path = ancestors(id, parentOf);
        const unchanged =
            (category.path || []).map(String).join() === path.join() &&
            category.depth === path.length;
        if (unchanged) return;

        ops.category.push({
            updateOne: {
                filter: { _id: category._id },
                update: { $set: { path, depth: path.length } },
            },
        });
        // A response carries its page's ancestors, so "everything under
        // Production" stays one indexed match. They move with the page —
        // and this is not the villager saving again, so `updatedAt` stays.
        if (category.is_screen) {
            ops.response.push({
                updateMany: {
                    filter: { categoryId: category._id },
                    update: { $set: { categoryPath: [...path, id] } },
                    timestamps: false,
                },
            });
        }
    });

    return { published: publishing.length, skipped, ops, history };
};

/**
 * Deletes something that was never published, with everything added under
 * it. All of that is unpublished too: a publish refuses to put anything out
 * before the new page or new question it sits in.
 *
 * What places had set about any of it (an override can be drafted on a
 * question that is still new) goes as well: it would point at nothing.
 */
const removeUnpublished = async (type, doc, adminId) => {
    if (type === "question") {
        const page = await Questions.find({ categoryId: doc.categoryId })
            .select({ parentQuestionId: 1 })
            .lean();
        const inside = below(doc._id, page, "parentQuestionId");
        const gone = [doc, ...inside].map((question) => question._id);
        await Questions.deleteMany({ _id: { $in: gone } });
        await PlaceOverrides.deleteMany({ targetId: { $in: gone } });
        return;
    }

    const all = await Categories.find().lean();
    const unpublished = all.filter((category) => category.unpublished);
    const ids = [doc, ...below(doc._id, unpublished, "parentId")].map(
        (category) => String(category._id)
    );

    // A published category waiting to move INTO one of these would be left
    // pointing at nothing, and the editor could not draw it any more. Its
    // move is dropped: it stays where it is published.
    const stranded = all.filter(
        (category) =>
            !category.unpublished &&
            category.hasDraft &&
            ids.includes(String(category.draft?.parentId))
    );
    if (stranded.length > 0) {
        await Categories.bulkWrite(
            stranded.map((category) => ({
                updateOne: {
                    filter: { _id: category._id },
                    update: draftUpdate(
                        category,
                        { parentId: category.parentId ?? null },
                        adminId
                    ),
                },
            }))
        );
    }

    // The same for a place's published question waiting to move ONTO one of
    // these pages: it stays on the page it is published on, where it was.
    const waiting = (await Questions.find({ hasDraft: true }).lean()).filter(
        (question) => ids.includes(String(question.draft?.categoryId))
    );
    if (waiting.length > 0) {
        await Questions.bulkWrite(
            waiting.map((question) => ({
                updateOne: {
                    filter: { _id: question._id },
                    update: draftUpdate(
                        question,
                        {
                            categoryId: question.categoryId,
                            order: question.order,
                        },
                        adminId
                    ),
                },
            }))
        );
    }

    const onThem = { categoryId: { $in: ids }, unpublished: true };
    const gone = await Questions.find(onThem).select({ _id: 1 }).lean();
    await Questions.deleteMany(onThem);
    await PlaceOverrides.deleteMany({
        targetId: { $in: [...ids, ...gone.map((question) => question._id)] },
    });
    await Categories.deleteMany({ _id: { $in: ids } });
};

module.exports = {
    CONFLICT,
    STALE,
    TYPE_LOCKED,
    PLACE_CANNOT_ARCHIVE,
    WITHOUT_DRAFT,
    applied,
    draftUpdate,
    writeDraft,
    writeOrder,
    assertRev,
    ancestors,
    below,
    requiredText,
    overrideUpdate,
    writeOverride,
    planPublish,
    removeUnpublished,
};
