const Joi = require("joi");
const mongoose = require("mongoose");
const Questions = require("../Models/questions");
const Categories = require("../Models/categories");
const Responses = require("../Models/responses");
const Counters = require("../Models/counters");
const Countries = require("../Models/countries");
const Villages = require("../Models/villages");
const History = require("../Models/questionnaireHistory");
const PlaceOverrides = require("../Models/placeOverrides");
const AppError = require("../AppError");
const {
    loadEffective,
    loadPlaceView,
    inheritedView,
    listPage,
} = require("../utils/liveQuestionnaire");
const { pendingRows, toText } = require("../utils/changeSummary");
const { namingIds } = require("../utils/questionTree");
const {
    publicRow,
    byDepthThenOrder,
    byOrder,
    editorLists,
    masterUsage,
    placePayload,
} = require("../utils/editorPayload");
const { normaliseLocalised } = require("../utils/localised");
const {
    answeredFilter,
    answeredSet,
    usageOf,
    usageOfCategory,
} = require("../utils/questionUsage");
const {
    CONFLICT,
    requiredText,
    writeDraft,
    overrideUpdate,
    writeOverride,
    planPublish,
    removeUnpublished,
} = require("../utils/drafts");
const {
    listPlaces,
    subtreeIds,
    namesInside,
    scopeOf,
    assertInScope,
    assertCanEdit,
    assertMaster,
    assertCanChange,
    readableOwners,
} = require("../utils/places");

/**
 * The editor's side of the questionnaire: one payload to draw it from — the
 * Master's, or one place's — and the two things that end a draft, publish
 * and discard, plus the record of what was published.
 *
 * The edits themselves stay where they were (Controllers/questions.js,
 * Controllers/categories.js); they only write drafts now. What a place sets
 * about a question that is not its own is written here (put_overrides).
 * Nothing here or there reaches the app until publish() applies it.
 */
const VERSION = "questionnaireVersion";
const MODELS = {
    question: Questions,
    category: Categories,
    override: PlaceOverrides,
};
const MAX_LIMIT = 200;
const SELECT_TYPES = ["single_select", "multi_select"];

// Lower-cased: documents are looked up by the id as Mongo prints it.
const idSchema = Joi.string().hex().length(24).lowercase();

/** What a row of the Publish dialog is made of, sent back as it was given. */
const itemsSchema = Joi.array()
    .items(
        Joi.object({
            type: Joi.string()
                .valid("question", "category", "override")
                .required(),
            id: idSchema.required(),
            rev: Joi.number().integer().min(0).required(),
        })
    )
    .min(1)
    .required();

/**
 * Everything the editor draws, in one payload: every category and question
 * with its draft applied, and the list of what is waiting to be published.
 * `scope=master` is the Master's; a place id is that place's questionnaire.
 */
module.exports.get_editor = async (req, res) => {
    const { admin } = res.locals;
    const { scope } = req.query;

    if (scope !== "master") {
        if (typeof scope !== "string" || !/^[a-f0-9]{24}$/i.test(scope)) {
            throw new AppError(0, "Unknown scope", 400);
        }
        // Refuses a place that is not the caller's before anything else
        // is read. With the overrides of the places inside it: their
        // pending changes are listed, and published, from here.
        const view = await loadPlaceView(admin, scope.toLowerCase(), {
            subtree: true,
        });
        const [answered, counter] = await Promise.all([
            answeredSet(),
            Counters.findById(VERSION).lean(),
        ]);
        return res.json(
            placePayload({ view, answered, version: counter?.seq || 1 })
        );
    }
    assertMaster(admin);

    const [loaded, answered, counter, countries, villages, changed] =
        await Promise.all([
            // The same resolver the app reads through, shown the Master's
            // drafts and unpublished documents. Its chain is empty, so
            // nothing a place owns comes back.
            loadEffective({ drafts: new Set(["master"]) }),
            answeredSet(),
            Counters.findById(VERSION).lean(),
            Countries.countDocuments(),
            Villages.countDocuments(),
            // What places have published about the Master's questions.
            PlaceOverrides.find({
                targetType: "question",
                published: { $exists: true },
            })
                .select({ placeId: 1, targetId: 1, published: 1 })
                .lean(),
        ]);
    const { categories, questions, resolved } = loaded;

    const lists = editorLists(
        resolved,
        answered,
        (doc) => !doc.ownerPlaceId
    );
    // The places are only read when one of them has changed something.
    const usage = masterUsage(
        changed,
        changed.length > 0 ? await listPlaces() : [],
        { countries, villages }
    );

    return res.json({
        scope: { type: "master" },
        version: counter?.seq || 1,
        reach: { countries, villages },
        categories: lists.categories
            .map(([, sent]) => sent)
            .sort(byDepthThenOrder),
        questions: lists.questions
            .map(([question, sent]) => ({
                ...sent,
                // Which places changed it, and how far its wording reaches.
                usage: usage(question._id),
            }))
            .sort(byOrder),
        pending: pendingRows({ categories, questions }).map(publicRow),
    });
};

/**
 * How much a question, or a page, is used: what the edit panel locks on.
 *
 * A regional account may ask about what it can see: the Master's, and what
 * the places above, at and inside its own have added.
 */
module.exports.get_usage = async (req, res) => {
    // From a query string: an array or an operator object would be checked
    // as one thing and counted as another.
    const schema = Joi.object({ questionId: idSchema, categoryId: idSchema })
        .xor("questionId", "categoryId")
        .options({ stripUnknown: true });
    const { error, value } = schema.validate(req.query);
    if (error) throw error;
    const { questionId, categoryId } = value;

    const owners = await readableOwners(res.locals.admin);
    if (owners) {
        const target = await (questionId ? Questions : Categories)
            .findById(questionId || categoryId)
            .select({ ownerPlaceId: 1 })
            .lean();
        const owner = target?.ownerPlaceId;
        if (owner && !owners.some((id) => String(id) === String(owner))) {
            throw new AppError(0, "This place is not yours.", 403);
        }
    }

    return res.json(
        questionId
            ? await usageOf(questionId)
            : await usageOfCategory(categoryId)
    );
};

/**
 * What a place sets about questions and categories it does not own (and,
 * for its own, only whether they are asked): the Asked switch, its own
 * wording, options switched off, options added. Saved as a draft on that
 * place's override; one call may carry many (a bulk hide).
 *
 * Each `patch` is merged into what the place has set so far — a key with a
 * value sets it, a key with `null` takes it back — and anything that changes
 * nothing is dropped (utils/drafts.js overrideUpdate).
 */
module.exports.put_overrides = async (req, res) => {
    const localised = Joi.alternatives().try(
        Joi.string(),
        Joi.object().pattern(Joi.string(), Joi.string().allow(""))
    );
    const schema = Joi.object({
        items: Joi.array()
            .items(
                Joi.object({
                    placeId: idSchema.required(),
                    targetType: Joi.string()
                        .valid("question", "category")
                        .required(),
                    targetId: idSchema.required(),
                    rev: Joi.number().integer().min(0).optional(),
                    patch: Joi.object({
                        asked: Joi.boolean().allow(null),
                        label: localised.allow(null),
                        helper_text: localised.allow(null, ""),
                        options: Joi.array()
                            .items(
                                Joi.object({
                                    value: Joi.string().required(),
                                    asked: Joi.boolean().required(),
                                })
                            )
                            .unique("value")
                            .allow(null),
                        addedOptions: Joi.array()
                            .items(
                                Joi.object({
                                    value: Joi.string().optional(),
                                    label: localised.required(),
                                    archived: Joi.boolean().optional(),
                                })
                            )
                            .unique("value", { ignoreUndefined: true })
                            .allow(null),
                    }).required(),
                })
            )
            // Two patches for one override would both start from the state
            // read before either was written.
            .unique((a, b) => a.placeId === b.placeId && a.targetId === b.targetId)
            .min(1)
            .required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const { admin } = res.locals;
    const places = await listPlaces();

    // One view per place named: a bulk change is many items for one place.
    // Loading it is also what refuses a place that is not the caller's.
    const views = new Map();
    const viewOf = async (placeId) => {
        if (!views.has(placeId)) {
            const view = await loadPlaceView(admin, placeId, { places });
            views.set(placeId, {
                ...view,
                inherited: inheritedView(view),
                own: new Map(
                    view.overrides
                        .filter((override) => String(override.placeId) === placeId)
                        .map((override) => [String(override.targetId), override])
                ),
            });
        }
        return views.get(placeId);
    };

    // Everything is worked out before anything is written: half a bulk
    // change would be worse than none.
    const changes = [];
    for (const item of value.items) {
        const { placeId, targetType, targetId } = item;
        const view = await viewOf(placeId);
        const kind = targetType === "question" ? "questions" : "categories";

        // Only what this place can see, and only while the Master still
        // asks it: what is archived there is not asked anywhere, and
        // nothing a place sets brings it back.
        const target = view.resolved[kind].get(targetId);
        if (!target) {
            throw new AppError(
                0,
                `${targetType === "question" ? "Question" : "Category"} not found`,
                404
            );
        }
        if (target.active === false) {
            throw new AppError(
                0,
                "This is archived in the Master, so a place cannot change it.",
                409
            );
        }

        const patch = { ...item.patch };
        if (Object.keys(patch).some((key) => key !== "asked")) {
            if (targetType === "category") {
                throw new AppError(
                    0,
                    "A category can only be hidden or shown for a place.",
                    400
                );
            }
            // Its wording is the question's own: edit-question changes it.
            if (String(target.ownerPlaceId) === placeId) {
                throw new AppError(
                    0,
                    "This place added this question: edit the question itself.",
                    400
                );
            }
        }
        if (
            (patch.options || patch.addedOptions) &&
            !SELECT_TYPES.includes(target.type)
        ) {
            throw new AppError(0, "Only a select question has options.", 400);
        }
        // A state is Mixed: none of this passes through a schema's validators.
        if (patch.label != null) {
            patch.label = requiredText(patch.label, "Question label");
        }
        if (patch.helper_text != null) {
            // Blank in every language is "none of its own": taken back.
            patch.helper_text = normaliseLocalised(patch.helper_text) ?? null;
        }
        if (patch.addedOptions) {
            patch.addedOptions = patch.addedOptions.map((option) => ({
                ...option,
                label: requiredText(option.label, "Option label"),
            }));
        }

        // The app names each entry of a list by its first field.
        if (targetType === "question" && patch.asked === false) {
            const page = [...view.resolved.questions.values()].filter(
                (question) =>
                    question.selfAsked &&
                    String(question.categoryId) === String(target.categoryId)
            );
            if (namingIds(page).has(targetId)) {
                throw new AppError(
                    0,
                    target.type === "section"
                        ? "This section holds the field that names each entry, so it cannot be hidden."
                        : "This field names each entry, so it cannot be hidden.",
                    409
                );
            }
        }

        const override = view.own.get(targetId) || null;
        if (item.rev !== undefined && item.rev !== (override?.rev || 0)) {
            throw new AppError(0, CONFLICT, 409);
        }

        // What the place gets without this override: the resolver's answer
        // with the place's own overrides left out.
        const above = view.inherited[kind].get(targetId);
        const result = overrideUpdate(
            override,
            patch,
            {
                asked: above.selfAsked,
                label: above.label,
                helper_text: above.helper_text,
                options: above.allOptions,
            },
            admin._id
        );

        // A select with every option switched off would still be asked —
        // and required, if it is — with nothing to choose.
        if (patch.options !== undefined || patch.addedOptions !== undefined) {
            const switches = new Map(
                (result.state.options || []).map(({ value, asked }) => [
                    String(value),
                    asked,
                ])
            );
            const stillOn = [
                ...(above.allOptions || []),
                ...(result.state.addedOptions || []).map((option) => ({
                    ...option,
                    asked: true,
                })),
            ].filter(
                (option) =>
                    !option.archived &&
                    (switches.get(String(option.value)) ?? option.asked)
            );
            if (SELECT_TYPES.includes(target.type) && stillOn.length === 0) {
                throw new AppError(
                    0,
                    "Leave at least one option on, or hide the question instead.",
                    409
                );
            }
        }

        changes.push({ item, override, result });
    }

    const items = [];
    for (const { item, override, result } of changes) {
        const { placeId, targetType, targetId } = item;
        items.push({
            placeId,
            targetId,
            rev: await writeOverride(
                override,
                { placeId, targetType, targetId },
                result,
                item.rev
            ),
        });
    }

    return res.json({ items });
};

/**
 * One attempt at a publish, inside a transaction.
 *
 * The driver runs this again when another write got in its way, so it works
 * only from what it reads here: nothing is carried in from outside, or over
 * from an earlier attempt. What to do with what was read is planPublish's
 * (utils/drafts.js); this is the reading and the writing around it.
 *
 * `places` is the one thing settled beforehand: which places this publish
 * covers (none for the Master's). It decides whose work may go out, not what
 * that work is.
 */
const publishOnce = async (items, admin, session, places, undoOf = null) => {
    // FIRST, before anything is read. Every publish writes this one
    // document, so two of them cannot interleave: the second waits here, or
    // is run again, until the first has committed.
    const version = await Counters.nextVersion(session);

    const categories = await Categories.find().session(session).lean();
    const questions = await Questions.find().session(session).lean();
    // Looked up by the ids that were sent, whatever place they turn out to
    // be: one that is not this publish's to put out is refused by
    // planPublish, not passed over here.
    const sent = items
        .filter((item) => item.type === "override")
        .map((item) => item.id);
    const overrides =
        sent.length > 0
            ? await PlaceOverrides.find({ _id: { $in: sent } })
                  .session(session)
                  .lean()
            : [];

    const { published, skipped, ops, history } = await planPublish({
        categories,
        questions,
        overrides,
        items,
        places,
        version,
        actor: admin,
        at: new Date(),
        undoOf,
        // The locks, asked again now: answers kept arriving while the
        // drafts waited.
        answered: async (ids) =>
            (await Responses.countDocuments({
                $or: ids.map(answeredFilter),
            }).session(session)) > 0,
        hasResponses: async (categoryId) =>
            (await Responses.countDocuments({ categoryId }).session(session)) >
            0,
        usedOptions: async (questionId) =>
            (await usageOf(questionId)).usedOptions,
    });

    if (published === 0) {
        // Nothing went out, so there is no new version. Rolling back takes
        // the counter back with it.
        await session.abortTransaction();
        return { version: version - 1, published, skipped };
    }

    // One round trip per collection, one after the other: a session carries
    // a single operation at a time.
    if (ops.category.length > 0) {
        await Categories.bulkWrite(ops.category, { session });
    }
    if (ops.question.length > 0) {
        await Questions.bulkWrite(ops.question, { session });
    }
    if (ops.response.length > 0) {
        await Responses.bulkWrite(ops.response, { session });
    }
    if (ops.override.length > 0) {
        await PlaceOverrides.bulkWrite(ops.override, { session });
    }

    // A place that hid a question does not start asking its replacement (and
    // a village that switched it back on keeps it): to the place it is the
    // same question. Its wording and option changes stay behind — they were
    // written for the old wording and the old options.
    const successorOf = new Map(
        ops.question
            .filter((op) => op.updateOne?.update.$set?.replacedBy)
            .map((op) => [
                String(op.updateOne.filter._id),
                op.updateOne.update.$set.replacedBy,
            ])
    );
    if (successorOf.size > 0) {
        const switched = await PlaceOverrides.find({
            targetId: { $in: [...successorOf.keys()] },
            "published.asked": { $exists: true },
        })
            .session(session)
            .lean();
        if (switched.length > 0) {
            await PlaceOverrides.insertMany(
                switched.map((override) => ({
                    placeId: override.placeId,
                    targetType: "question",
                    targetId: successorOf.get(String(override.targetId)),
                    published: { asked: override.published.asked },
                    rev: 1,
                })),
                { session }
            );
        }
    }

    await History.insertMany(history, { session });

    return { version, published, skipped };
};

/**
 * Puts drafts out: from here on the app asks what the editor shows.
 *
 * All or nothing per publish — the drafts, the version and the history are
 * one transaction — but not all or nothing per ROW: a row that cannot go out
 * (it waits on another, or answers arrived since) is skipped with its reason
 * and the rest is published.
 *
 * `scope` is "master", or a place: that place's own work and the work of
 * the places inside it — what it added, and what it set about the rest.
 */
module.exports.publish = async (req, res) => {
    const schema = Joi.object({
        scope: Joi.string().required(),
        items: itemsSchema,
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const { admin } = res.locals;
    // The places a place's publish covers, each with its names from the
    // country down (history keeps them). Whoever may change the place may
    // change everything inside it, so being let into the scope is the whole
    // check; each item is then held to these places by planPublish.
    let places;
    if (value.scope === "master") {
        assertMaster(admin);
    } else {
        if (!/^[a-f0-9]{24}$/i.test(value.scope)) {
            throw new AppError(0, "Unknown scope", 400);
        }
        const all = await listPlaces();
        places = namesInside(
            assertCanEdit(admin, value.scope.toLowerCase(), all),
            all
        );
    }

    const session = await mongoose.startSession();
    let answer;
    try {
        await session.withTransaction(async () => {
            answer = await publishOnce(value.items, admin, session, places);
        });
    } finally {
        await session.endSession();
    }

    return res.json(answer);
};

/**
 * Throws drafts away. A published document goes back to what is published; a
 * document that was never published is deleted, with what was added in it.
 * The same for what a place set: its override goes back to what it has
 * published, or goes altogether when it never published anything.
 */
module.exports.discard = async (req, res) => {
    const schema = Joi.object({ items: itemsSchema }).options({
        stripUnknown: true,
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const { admin } = res.locals;
    // Read once, and only when something a place owns is among the items.
    let places;

    // Every rev is checked before anything is dropped: half a discard would
    // be worse than none. So is whose each document is: the Master's are a
    // super admin's, a place's are for whoever manages that place.
    const found = [];
    for (const item of value.items) {
        const doc = await MODELS[item.type].findById(item.id).lean();
        // Already gone — removed with the new group or category it sat in,
        // or discarded from another window. There is nothing left to do.
        if (!doc) continue;
        const owner = item.type === "override" ? doc.placeId : doc.ownerPlaceId;
        if (owner && !places) places = await listPlaces();
        await assertCanChange(admin, owner, places);
        if ((doc.rev || 0) !== item.rev) throw new AppError(0, CONFLICT, 409);
        if (doc.unpublished || doc.hasDraft) found.push({ type: item.type, doc });
    }

    // Drafts first. Removing a new category can rewrite the draft of a
    // category that was moving into it, which would then no longer be the
    // revision that was just checked.
    for (const { type, doc } of found) {
        if (type === "override") {
            await writeOverride(
                doc,
                null,
                overrideUpdate(doc, null, {}, admin._id),
                doc.rev || 0
            );
        } else if (!doc.unpublished) {
            await writeDraft(MODELS[type], doc, doc.rev || 0, null, admin._id);
        }
    }
    for (const { type, doc } of found) {
        if (doc.unpublished) await removeUnpublished(type, doc, admin._id);
    }

    return res.json({ discarded: found.length });
};

/**
 * The history an account can see, as a filter: every row, or for a regional
 * account the rows of its own place and of the places inside it.
 */
const historyOf = async (admin) => {
    if (admin.role === "admin") return { match: {}, places: null };
    const places = await listPlaces();
    const { rootId } = scopeOf(admin, places);
    return {
        match: { placeId: { $in: subtreeIds(rootId, places) } },
        places,
    };
};

/** The newest of those rows: the only one that can be undone. */
const newestRow = async ({ match }) =>
    History.findOne(match).sort({ version: -1, _id: -1 }).lean();

// A reorder is dragged back, and what was deleted is gone: neither has a
// "before" that can simply be put back. (Rows older than `source` have none.)
const canUndo = (row) =>
    Boolean(row?.source) && row.source !== "order" && row.after !== null;

const undoable = async (admin) => {
    const row = await newestRow(await historyOf(admin));
    return canUndo(row) ? row._id : null;
};

const PENDING =
    "This has a change waiting to be published. Publish or discard that first.";
const GONE = "It no longer exists, so there is nothing to undo.";

/**
 * Takes back the latest published change — the newest row of the history the
 * caller can see, and only that one.
 *
 * The row's `before` is written as a draft and published at once, through
 * the ordinary publish: every lock and cascade is the publish's own, and
 * history gets the row it would get had someone made the opposite change by
 * hand (marked with `undoOf`). Something NEW is taken back by deleting it,
 * which the publish refuses once it has answers.
 */
module.exports.undo = async (req, res) => {
    const schema = Joi.object({ id: idSchema.required() }).options({
        stripUnknown: true,
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const { admin } = res.locals;
    const refuse = (message) => {
        throw new AppError(0, message, 409);
    };

    const mine = await historyOf(admin);
    const row = await newestRow(mine);
    if (!row || String(row._id) !== value.id) {
        refuse("Only the latest change can be undone.");
    }
    if (!canUndo(row)) {
        refuse(
            row.after === null
                ? "Something deleted cannot be brought back. Add it again."
                : "This change is not undone in one step. Change it back by hand."
        );
    }

    // Whose publish this is: the Master's, or the place the row belongs to.
    let places;
    if (row.placeId) {
        const all = mine.places || (await listPlaces());
        places = namesInside(assertCanEdit(admin, row.placeId, all), all);
    } else {
        assertMaster(admin);
    }

    // The draft that takes the change back, the item that publishes it, and
    // how to drop it again should the publish refuse.
    let item;
    let dropDraft;
    if (row.source === "override") {
        const identity = {
            placeId: row.placeId,
            targetType: row.targetType,
            targetId: row.targetId,
        };
        const find = () =>
            PlaceOverrides.findOne({
                placeId: row.placeId,
                targetId: row.targetId,
            }).lean();
        const override = await find();
        if (!(await MODELS[row.targetType].exists({ _id: row.targetId }))) {
            refuse(GONE);
        }
        // No document is what a publish leaves when the place had put
        // everything back; otherwise it has gone with its target.
        if (!override && Object.keys(row.after || {}).length > 0) refuse(GONE);
        if (override?.hasDraft) refuse(PENDING);

        // The whole next state is what was published before this change.
        await writeOverride(override, identity, {
            action: "draft",
            update: {
                $set: {
                    draft: row.before || {},
                    hasDraft: true,
                    draftBy: admin._id,
                    draftAt: new Date(),
                },
                $inc: { rev: 1 },
            },
        });
        const drafted = await find();
        item = { type: "override", id: String(drafted._id), rev: drafted.rev };
        dropDraft = async () => {
            const now = await find();
            if (!now?.hasDraft) return;
            await writeOverride(
                now,
                null,
                overrideUpdate(now, null, {}, admin._id),
                now.rev || 0
            );
        };
    } else {
        const Model = MODELS[row.source];
        const doc = await Model.findById(row.targetId).lean();
        if (!doc) refuse(GONE);
        if (doc.hasDraft) refuse(PENDING);

        let patch = row.before;
        if (patch === null) {
            // The old question was retired with it, and places carried
            // their switches over: more than one step back.
            if (doc.replaces) {
                refuse(
                    "A replacement is taken back by archiving it and restoring the question it replaced."
                );
            }
            patch = { deleted: true };
        } else if (row.source === "question" && patch.options) {
            // Putting the old list back removes what this change added.
            const kept = new Set(patch.options.map((option) => option.value));
            const added = (doc.options || [])
                .map((option) => String(option.value))
                .filter((key) => !kept.has(key));
            if (added.length > 0) {
                const { usedOptions } = await usageOf(doc._id);
                if (added.some((key) => usedOptions.includes(key))) {
                    refuse(
                        "An option this change added already has answers. Archive it instead."
                    );
                }
            }
        }

        const saved = await writeDraft(Model, doc, doc.rev || 0, patch, admin._id);
        item = { type: row.source, id: String(doc._id), rev: saved.rev };
        dropDraft = async () => {
            const now = await Model.findById(doc._id).lean();
            if (!now?.hasDraft) return;
            await writeDraft(Model, now, now.rev || 0, null, admin._id);
        };
    }

    const session = await mongoose.startSession();
    let answer;
    try {
        await session.withTransaction(async () => {
            answer = await publishOnce([item], admin, session, places, row._id);
        });
    } catch (failure) {
        await dropDraft();
        throw failure;
    } finally {
        await session.endSession();
    }

    if (answer.published === 0) {
        await dropDraft();
        refuse(
            answer.skipped[0]?.reason ||
                "This change is not undone in one step. Change it back by hand."
        );
    }
    return res.json(answer);
};

/**
 * What was published, newest first.
 *
 * `place=master` is the rows no place owns, and a super admin's to read. Any
 * other `place` is that place and everything inside it. A regional account
 * is always held to its own place — with no `place` it gets all of it — so
 * it never sees the Master's rows or a neighbour's.
 */
module.exports.get_history = async (req, res) => {
    const { admin } = res.locals;
    const { place, actor, from, to } = req.query;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), MAX_LIMIT);
    const page = Math.max(Number(req.query.page) || 0, 0);

    const match = {};
    // Everyone who ever published, whatever the filters: it is what the
    // "by whom" filter offers. A regional account is offered those who
    // published in its place.
    const everyone = [];
    if (place === "master" && admin.role === "admin") {
        match.placeId = null;
    } else if (place || admin.role !== "admin") {
        const places = await listPlaces();
        const rootId = place || scopeOf(admin, places).rootId;
        // For a regional account "master" is refused here like any other
        // place outside its own.
        assertInScope(admin, rootId, places);
        const inside = subtreeIds(rootId, places);
        // A place that has been deleted left its rows behind: they are
        // still found by its id.
        match.placeId = { $in: inside.length > 0 ? inside : [rootId] };
        if (admin.role !== "admin") {
            everyone.push({ $match: { placeId: match.placeId } });
        }
    }
    if (actor) match.actorId = actor;
    if (from || to) {
        match.at = {
            ...(from && { $gte: new Date(from) }),
            ...(to && { $lte: new Date(to) }),
        };
    }

    const [rows, total, actors] = await Promise.all([
        History.find(match)
            .sort({ version: -1, _id: -1 })
            .skip(page * limit)
            .limit(limit)
            .lean(),
        History.countDocuments(match),
        History.aggregate([
            ...everyone,
            { $group: { _id: "$actorId", name: { $last: "$actorName" } } },
            { $sort: { name: 1 } },
        ]),
    ]);

    return res.json({
        // The one row "Undo" is offered on, whatever the filters show.
        latest: await undoable(admin),
        rows: rows.map((row) => ({
            _id: row._id,
            version: row.version,
            at: row.at,
            actorName: row.actorName,
            placeId: row.placeId,
            placeNames: row.placeNames || [],
            targetType: row.targetType,
            label: row.label,
            // Made now, from what was stored: see utils/changeSummary.js
            summary: toText(row.change || {}, row.targetType),
        })),
        total,
        actors: actors.map(({ _id, name }) => ({ _id, name })),
    });
};
