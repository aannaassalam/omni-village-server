const mongoose = require("mongoose");
const AppError = require("../AppError");
const { localise } = require("./localised");
const { FILE_TYPES, FILE_ID } = require("./fileKinds");

const MAX_TEXT_LENGTH = 5000;
const DEFAULT_MAX_ROWS = 200;
const MAX_GROUP_DEPTH = 2;

const isEmpty = (value) =>
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

const bad = (message) => {
    throw new AppError(0, message, 400);
};

/**
 * Validates `value` against the question's CURRENT type/options.
 *
 * `children` is the group's child questions, keyed by id — only used for
 * repeatable_group. `depth` guards against nesting beyond MAX_GROUP_DEPTH.
 *
 * `ctx` is what a resubmission needs; a first answer has none:
 *   saved — the value already stored for THIS question. The app resends every
 *           answer on every save, so what was valid when it was saved has to
 *           stay valid after an option is removed.
 *   known — id strings of every question of the screen, live or not. A row
 *           answer for one of them that is not in `children` (hidden after
 *           the form was opened) is ignored instead of refused.
 *   complete — false for "Save as draft" and for a list page saving itself.
 *           Only then is a top-level group let off its minimum number of
 *           rows, as the app lets it off. Rows are never let off anything.
 *   carried — id strings of the row fields this response is carrying for a
 *           form that was not served them (see keptFor below). A required
 *           one of those is held by the entry although this save omits it.
 *   files — for a photo or audio answer: a Map of file id (lower case) to
 *           `{ kind, mine }`, the files this caller may put in an answer.
 *           The caller reads it from the database, which this file cannot.
 *           Without it only the shape of the answer is checked.
 */
/**
 * What a select may hold. When the caller knows every key that was ever valid
 * here (`knownValues`, from utils/effectiveQuestionnaire.js: the Master's
 * options, archived ones included, plus what the places above added), that is
 * the list — an option switched off a minute ago must not fail a form that
 * was already open. Otherwise today's options. Always plus what this answer
 * already was.
 */
const allowedValues = (question, ctx) =>
    (question.knownValues
        ? [...question.knownValues]
        : (question.options || []).map((o) => o.value)
    ).concat(ctx.saved ?? []);

const validateAnswer = (question, value, children = new Map(), depth = 1, ctx = {}) => {
    const label = localise(question.label);

    // Depth is checked before the empty-value shortcut below: an over-nested
    // group that happens to have no rows is still an over-nested group.
    if (question.type === "repeatable_group" && depth > MAX_GROUP_DEPTH) {
        bad(`"${label}" is nested deeper than ${MAX_GROUP_DEPTH} levels`);
    }

    // Before the empty-value shortcut: a section holds no value at all, and
    // a blank one must not be stored as its answer either.
    if (question.type === "section") {
        bad(`"${label}" is a section and cannot be answered directly`);
    }

    if (question.required && isEmpty(value)) {
        bad(`"${label}" is required`);
    }
    // Optional and unanswered is always fine — a skipped question is simply
    // absent from the response, which is how "added mid-survey" stays visible.
    if (!question.required && isEmpty(value)) return;

    switch (question.type) {
        case "text": {
            if (typeof value !== "string") bad(`"${label}" must be text`);
            if (value.length > MAX_TEXT_LENGTH) {
                bad(`"${label}" must be ${MAX_TEXT_LENGTH} characters or fewer`);
            }
            return;
        }

        case "number": {
            if (typeof value !== "number" || !Number.isFinite(value)) {
                bad(`"${label}" must be a number`);
            }
            // As for options: what was valid when it was saved stays valid
            // after the range is changed, until it is edited.
            if (value === ctx.saved) return;
            if (question.min !== null && question.min !== undefined && value < question.min) {
                bad(`"${label}" must be at least ${question.min}`);
            }
            if (question.max !== null && question.max !== undefined && value > question.max) {
                bad(`"${label}" must be at most ${question.max}`);
            }
            return;
        }

        case "boolean": {
            // Strict: "true"/0/1 are rejected so the stored type is never ambiguous.
            if (value !== true && value !== false) {
                bad(`"${label}" must be true or false`);
            }
            return;
        }

        case "date": {
            // Text only: `new Date(0)` and `new Date(false)` are dates too.
            const parsed = typeof value === "string" ? new Date(value) : new Date(NaN);
            if (Number.isNaN(parsed.getTime())) bad(`"${label}" must be a valid date`);
            return;
        }

        case "single_select": {
            // Today's options plus what this answer already was: an unchanged
            // answer on a since-removed option must not fail every later save,
            // while a fresh choice of that option still does.
            const allowed = allowedValues(question, ctx);
            if (!allowed.includes(value)) {
                bad(`"${value}" is not an option for "${label}"`);
            }
            return;
        }

        case "multi_select": {
            if (!Array.isArray(value)) bad(`"${label}" must be a list`);
            // As for single_select: today's options plus the saved selections.
            const allowed = allowedValues(question, ctx);
            value.forEach((entry) => {
                if (!allowed.includes(entry)) {
                    bad(`"${entry}" is not an option for "${label}"`);
                }
            });
            if (new Set(value).size !== value.length) {
                bad(`"${label}" has duplicate selections`);
            }
            return;
        }

        case "repeatable_group": {
            if (!Array.isArray(value)) bad(`"${label}" must be a list of rows`);

            const minRows = question.min ?? 0;
            const maxRows = question.max ?? DEFAULT_MAX_ROWS;
            if ((ctx.complete ?? true) && value.length < minRows) {
                bad(`"${label}" needs at least ${minRows} row(s)`);
            }
            if (value.length > maxRows) bad(`"${label}" allows at most ${maxRows} row(s)`);

            const seenRowIds = new Set();
            const mentioned = mentionedIn(value);
            value.forEach((row) => {
                if (!row || typeof row !== "object") bad(`"${label}" has an invalid row`);
                if (!Array.isArray(row.answers)) bad(`"${label}" row is missing answers`);
                if (row.rowId !== undefined) {
                    if (typeof row.rowId !== "string" || !row.rowId.trim()) {
                        bad(`"${label}" row has an invalid rowId`);
                    }
                    if (seenRowIds.has(row.rowId)) {
                        bad(`"${label}" has duplicate rowId "${row.rowId}"`);
                    }
                    seenRowIds.add(row.rowId);
                }

                // A row finds its saved self by rowId, never by position; one
                // sent without a rowId is new.
                const savedRow =
                    row.rowId && (ctx.saved || []).find((old) => old.rowId === row.rowId);

                // Rows bind to children by questionId ONLY — never by position.
                const answeredInRow = new Set();
                row.answers.forEach((answer) => {
                    if (!answer || typeof answer !== "object") {
                        bad(`"${label}" row has an invalid answer`);
                    }
                    const id = String(answer.questionId);
                    if (answeredInRow.has(id)) {
                        bad(`"${label}" row answers one question twice`);
                    }
                    answeredInRow.add(id);

                    const child = children.get(String(answer.questionId));
                    if (!child) {
                        // Unserved is not unknown: a field of this screen that
                        // was hidden after the form was opened. It is skipped
                        // here and snapshotAnswer keeps what the row had saved.
                        if (ctx.known?.has(String(answer.questionId))) return;
                        bad(
                            `Unknown question ${answer.questionId} in "${label}" row`
                        );
                    }
                    validateAnswer(
                        child,
                        answer.value,
                        child.childMap || new Map(),
                        depth + 1,
                        {
                            saved: (savedRow?.answers || []).find(
                                (old) => String(old.questionId) === String(child._id)
                            )?.value,
                            known: ctx.known,
                            carried: ctx.carried,
                            files: ctx.files,
                        }
                    );
                });

                // Required children missing from the row are caught here rather
                // than silently stored as absent.
                //
                // Except in an entry that was saved without that field — it
                // was hidden then, or became required since, or a place
                // added it. The app resends every entry on every save, so one
                // old entry would otherwise fail them all: it keeps its pass
                // until the field is filled in. A NEW entry, and a field the
                // saved entry did have, are checked as ever.
                children.forEach((child) => {
                    if (!child.required) return;
                    const has = (answers) =>
                        answers.some(
                            (a) =>
                                String(a.questionId) === String(child._id) &&
                                !isEmpty(a.value)
                        );
                    if (has(row.answers)) return;
                    if (savedRow && !has(savedRow.answers || [])) return;
                    // This form was never served the field (keptFor): an
                    // entry that holds it keeps its saved value, and a new
                    // entry cannot have it — neither can be asked for it.
                    if (
                        ctx.carried?.has(String(child._id)) &&
                        !mentioned.has(String(child._id))
                    ) {
                        return;
                    }
                    bad(`"${localise(child.label)}" is required in "${label}"`);
                });
            });
            return;
        }

        case "photo":
        case "audio": {
            // A list of file ids (Models/answerFiles.js), at most `max`.
            if (!Array.isArray(value)) bad(`"${label}" must be a list of files`);
            if (!value.every((id) => typeof id === "string" && FILE_ID.test(id))) {
                bad(`"${label}" holds something that is not a file`);
            }
            // In lower case, the one case they are stored and compared in.
            const ids = value.map((id) => id.toLowerCase());
            if (new Set(ids).size !== ids.length) bad(`"${label}" holds one file twice`);

            const saved = (Array.isArray(ctx.saved) ? ctx.saved : []).map((id) =>
                String(id).toLowerCase()
            );
            const added = ids.filter((id) => !saved.includes(id));
            // As for a number's range: what was valid when it was saved
            // stays valid after `max` is lowered, until it is changed.
            const unchanged = added.length === 0 && ids.length === saved.length;
            const most = question.max ?? 1;
            if (!unchanged && ids.length > most) {
                bad(`"${label}" takes at most ${most} file(s)`);
            }

            // An id proves nothing by itself. One that this answer did not
            // already hold has to be a file the caller uploaded, of the kind
            // asked for: otherwise anyone could put another person's photo
            // in their answer, and the dashboard would show it. All three
            // failures read the same, so the answer does not say which ids
            // are somebody else's files.
            if (ctx.files) {
                added.forEach((id) => {
                    const file = ctx.files.get(id);
                    if (!file || !file.mine || file.kind !== question.type) {
                        bad(`“${label}”: a file could not be found. Add it again.`);
                    }
                });
            }
            return;
        }

        default:
            bad(`Unsupported question type "${question.type}"`);
    }
};

/** The ids answered in ANY row of one group's value, as sent. */
const mentionedIn = (rows) =>
    new Set(
        (Array.isArray(rows) ? rows : []).flatMap((row) =>
            (Array.isArray(row?.answers) ? row.answers : [])
                .filter((answer) => answer && typeof answer === "object")
                .map((answer) => String(answer.questionId))
        )
    );

/**
 * What a saved row keeps although this save did not send it.
 *
 * The app rebuilds each row from the fields it was served and resends the
 * whole group; inside a row it sends no blanks, so "not sent" is how a
 * cleared field arrives. Two kinds of field must not be read that way:
 *
 *   - one that is not served any more (hidden after villagers filled it in):
 *     its values ride along, exactly as they were stored;
 *   - one that is served AGAIN after that, to a form that was opened while
 *     it was hidden and so still cannot send it. Such a form mentions the
 *     field in none of its rows — a form that was served it resends it with
 *     every entry that holds it — so the values keep riding along until a
 *     save mentions the field somewhere.
 *
 * `carry` is `{ was, now }`, two Sets of field ids: what the response was
 * carrying before this save, and (filled in here) what it carries after it.
 *
 * ponytail: the second rule cannot tell that stale form from a villager who
 * blanks the field in every entry at once right after it came back: their
 * blank is kept as the old value until one save sends the field in some
 * entry. The real fix is the app sending a cleared row field as null, as it
 * does at the top level (QUESTIONNAIRE_PLAN.md, phase 8).
 */
const keptFor = (savedAnswers, sent, children, mentioned, carry) =>
    savedAnswers.filter((answer) => {
        const id = String(answer.questionId);
        if (sent.has(id) && children.has(id)) return false;
        const unserved = !children.has(id);
        const unseen = Boolean(carry?.was.has(id)) && !mentioned.has(id);
        if (!unserved && !unseen) return false;
        carry?.now.add(id);
        return true;
    });

/**
 * Freezes the answer: label/type/options are copied in, recursively, so each
 * child answer inside a row carries its OWN snapshot. Nothing in a stored row
 * references a child by position.
 *
 * `saved` is the snapshot already stored for this question, if any. It keeps
 * a removed option readable and gives each row back its hidden fields
 * (`carry`: see keptFor).
 */
const snapshotAnswer = (question, value, children = new Map(), saved, carry) => {
    // label/options keep their full localised objects so a stored answer can be
    // read back in any language it was offered in.
    const base = {
        questionId: question._id,
        label: question.label,
        type: question.type,
        options: (question.options || []).map((o) => ({
            value: o.value,
            label: o.label,
        })),
        // Whose wording `label` is, when it is not the Master's: the place
        // the resolver took it from (`from.label`). Left out otherwise, so a
        // missing `changedIn` reads as "nobody changed it" — on every
        // response saved before places could, too. An ObjectId at every
        // depth: inside a row nothing casts it.
        ...(question.from?.label
            ? { changedIn: new mongoose.Types.ObjectId(question.from.label) }
            : {}),
    };

    // An unchanged answer may sit on an option that has since been removed
    // (validateAnswer lets it through). Its entry comes from the earlier
    // snapshot, so the stored answer still says what was chosen.
    const chosen = [].concat(value ?? []);
    (saved?.options || []).forEach((old) => {
        const current = base.options.some((o) => o.value === old.value);
        if (!current && chosen.includes(old.value)) base.options.push(old);
    });
    // …or on one switched off for this place after the form was opened: the
    // resolver's full list (`allOptions`) still knows what it was called.
    (question.allOptions || []).forEach((option) => {
        const current = base.options.some((o) => o.value === option.value);
        if (!current && chosen.includes(option.value)) {
            base.options.push({ value: option.value, label: option.label });
        }
    });

    // A photo's or a recording's file ids are stored in lower case, the way
    // Mongo prints them: one spelling, whatever a client sent.
    if (FILE_TYPES.includes(question.type)) {
        return { ...base, value: value.map((id) => id.toLowerCase()) };
    }

    if (question.type !== "repeatable_group") {
        return {
            ...base,
            value: question.type === "date" && value ? new Date(value) : value,
        };
    }

    const mentioned = mentionedIn(value);
    // A form that sends a field was served it: nothing is carried for that
    // field any more (keptFor puts back what is still not served).
    mentioned.forEach((id) => carry?.now.delete(id));
    const rows = (value || []).map((row) => {
        // Matched by rowId, as in validateAnswer. A row with no saved self
        // gets nothing carried, and a saved row that was not sent is gone.
        const savedRow =
            row.rowId && (saved?.value || []).find((old) => old.rowId === row.rowId);
        const savedAnswers = savedRow?.answers || [];
        const sent = new Set(
            row.answers
                .filter((answer) => !isEmpty(answer.value))
                .map((answer) => String(answer.questionId))
        );

        return {
            rowId: row.rowId || new mongoose.Types.ObjectId().toString(),
            answers: row.answers
                .flatMap((answer) => {
                    const child = children.get(String(answer.questionId));
                    // Not served: validateAnswer ignored it, so it is not stored.
                    // Nor is a blank: inside a row, as at the top level, an
                    // empty value is no answer.
                    if (!child || isEmpty(answer.value)) return [];
                    return [
                        snapshotAnswer(
                            child,
                            answer.value,
                            child.childMap || new Map(),
                            // A nested group gets its own saved rows this way,
                            // so the same carry happens one level down.
                            savedAnswers.find(
                                (old) => String(old.questionId) === String(child._id)
                            ),
                            carry
                        ),
                    ];
                })
                .concat(keptFor(savedAnswers, sent, children, mentioned, carry)),
        };
    });

    return { ...base, value: rows };
};

/**
 * Every question id a stored `answers` array holds, at ANY depth: top level,
 * inside rows, inside nested rows. Kept on the response as `answeredIds`, so
 * "is this question answered anywhere?" is one indexed match instead of a
 * guess at how deep to look.
 */
const collectAnsweredIds = (answers) => {
    const ids = new Set();
    const walk = (list) =>
        (list || []).forEach((answer) => {
            ids.add(String(answer.questionId));
            // Only a group's value is a list of rows; a multi_select's entries
            // have no answers and fall straight through.
            if (Array.isArray(answer.value)) {
                answer.value.forEach((row) => walk(row?.answers));
            }
        });
    walk(answers);
    return [...ids];
};

module.exports = {
    validateAnswer,
    snapshotAnswer,
    collectAnsweredIds,
    MAX_GROUP_DEPTH,
};

/* ------------------------------------------------------------------ */
/* Self-check: node utils/answerValidator.js                           */
/* ------------------------------------------------------------------ */
function demo() {
    const assert = require("assert");
    const id = () => new mongoose.Types.ObjectId();

    const throws = (fn, why) => {
        let threw = false;
        try {
            fn();
        } catch (err) {
            threw = err instanceof AppError;
        }
        assert.ok(threw, `expected AppError: ${why}`);
    };

    const q = (over) => ({
        _id: id(),
        label: { en: "Q" },
        required: false,
        ...over,
    });

    // text
    validateAnswer(q({ type: "text" }), "hello");
    throws(() => validateAnswer(q({ type: "text" }), 42), "text given a number");
    throws(
        () => validateAnswer(q({ type: "text" }), "x".repeat(5001)),
        "text over the length cap"
    );

    // number + range
    validateAnswer(q({ type: "number", min: 1, max: 30 }), 4);
    throws(
        () => validateAnswer(q({ type: "number", min: 1, max: 30 }), 99),
        "number above max"
    );
    throws(() => validateAnswer(q({ type: "number" }), "4"), "number given a string");

    // boolean is strict
    validateAnswer(q({ type: "boolean" }), false);
    throws(() => validateAnswer(q({ type: "boolean" }), "true"), "boolean given a string");
    throws(() => validateAnswer(q({ type: "boolean" }), 1), "boolean given 1");

    // date
    validateAnswer(q({ type: "date" }), "2024-03-01");
    throws(() => validateAnswer(q({ type: "date" }), "not-a-date"), "unparseable date");

    // selects
    const opts = [
        { value: "well", label: "Well" },
        { value: "tap", label: "Tap" },
    ];
    validateAnswer(q({ type: "single_select", options: opts }), "well");
    throws(
        () => validateAnswer(q({ type: "single_select", options: opts }), "lake"),
        "value not among options"
    );
    validateAnswer(q({ type: "multi_select", options: opts }), ["well", "tap"]);
    throws(
        () => validateAnswer(q({ type: "multi_select", options: opts }), ["well", "well"]),
        "duplicate multi_select selections"
    );

    // required
    throws(
        () => validateAnswer(q({ type: "text", required: true }), ""),
        "required question left empty"
    );
    validateAnswer(q({ type: "text" }), "");

    // repeatable_group, depth 1
    const age = q({ type: "number", label: { en: "Age" }, min: 0, max: 120 });
    const kids = new Map([[String(age._id), age]]);
    const group = q({ type: "repeatable_group", label: { en: "Members" }, max: 2 });
    validateAnswer(
        group,
        [{ rowId: "r1", answers: [{ questionId: age._id, value: 31 }] }],
        kids
    );
    throws(
        () =>
            validateAnswer(
                group,
                [{ rowId: "r1", answers: [{ questionId: id(), value: 31 }] }],
                kids
            ),
        "row referencing an unknown child questionId"
    );
    throws(
        () =>
            validateAnswer(
                group,
                [
                    { rowId: "r1", answers: [] },
                    { rowId: "r1", answers: [] },
                ],
                kids
            ),
        "duplicate rowId within a group"
    );
    throws(
        () =>
            validateAnswer(
                group,
                [
                    { rowId: "a", answers: [] },
                    { rowId: "b", answers: [] },
                    { rowId: "c", answers: [] },
                ],
                kids
            ),
        "more rows than max"
    );

    // depth 3 is rejected (poultry needs 2: Livestock -> Products)
    const inner = q({ type: "repeatable_group", label: { en: "Inner" } });
    inner.childMap = new Map();
    const mid = q({ type: "repeatable_group", label: { en: "Mid" } });
    mid.childMap = new Map([[String(inner._id), inner]]);
    const outer = q({ type: "repeatable_group", label: { en: "Outer" } });
    throws(
        () =>
            validateAnswer(
                outer,
                [
                    {
                        rowId: "r1",
                        answers: [
                            {
                                questionId: mid._id,
                                value: [
                                    {
                                        rowId: "r2",
                                        answers: [
                                            { questionId: inner._id, value: [] },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
                new Map([[String(mid._id), mid]])
            ),
        "group nested three levels deep"
    );

    // snapshot freezes label/type/options at every level
    const snap = snapshotAnswer(
        group,
        [{ answers: [{ questionId: age._id, value: 31 }] }],
        kids
    );
    assert.strictEqual(snap.type, "repeatable_group");
    assert.ok(snap.value[0].rowId, "server assigns a rowId when absent");
    assert.strictEqual(snap.value[0].answers[0].label.en, "Age");
    assert.strictEqual(snap.value[0].answers[0].value, 31);

    const snapSelect = snapshotAnswer(
        q({ type: "single_select", label: { en: "Source" }, options: opts }),
        "well"
    );
    assert.strictEqual(snapSelect.options.length, 2, "options are snapshotted");

    // a section can never be answered
    throws(
        () => validateAnswer(q({ type: "section", label: { en: "Utilisation" } }), "x"),
        "a section given a value"
    );

    // multilingual: the snapshot keeps every language, not just the rendered one
    const multi = q({
        type: "single_select",
        label: { en: "Water source", ms: "Sumber air" },
        options: [{ value: "well", label: { en: "Well", ms: "Perigi" } }],
    });
    const multiSnap = snapshotAnswer(multi, "well");
    assert.strictEqual(multiSnap.label.ms, "Sumber air");
    assert.strictEqual(multiSnap.options[0].label.ms, "Perigi");

    /* ---- safer saving: what is already saved shapes what is accepted ---- */

    // An answer as it sits in a stored response — what `saved` is made of.
    const stored = (question, value, options = []) => ({
        questionId: question._id,
        label: question.label,
        type: question.type,
        options,
        value,
    });

    // A removed option: unchanged, the answer still validates; chosen afresh
    // it does not; and its entry survives in the snapshot, once.
    const lake = { value: "lake", label: { en: "Lake" } };
    const source = q({ type: "single_select", label: { en: "Source" }, options: opts });
    const savedSource = stored(source, "lake", [...opts, lake]);
    validateAnswer(source, "lake", new Map(), 1, { saved: "lake" });
    throws(
        () => validateAnswer(source, "lake", new Map(), 1, { saved: "well" }),
        "fresh choice of a removed option"
    );
    assert.deepStrictEqual(
        snapshotAnswer(source, "lake", new Map(), savedSource).options,
        [...opts, lake],
        "a removed option that is still chosen keeps its entry"
    );
    assert.strictEqual(
        snapshotAnswer(source, "well", new Map(), savedSource).options.length,
        2,
        "an option no longer chosen is not kept, and none is duplicated"
    );
    const sources = q({ type: "multi_select", options: opts });
    validateAnswer(sources, ["lake", "tap"], new Map(), 1, { saved: ["well", "lake"] });
    throws(
        () => validateAnswer(sources, ["pond"], new Map(), 1, { saved: ["well", "lake"] }),
        "multi_select entry that is neither an option nor saved"
    );

    // A group whose `area` field was hidden after rows were filled in: still a
    // question of the screen (known), no longer one of the served children.
    const rice = { value: "rice", label: { en: "Rice" } };
    const millet = { value: "millet", label: { en: "Millet" } };
    const crop = q({ type: "single_select", label: { en: "Crop" }, options: [rice] });
    const area = q({ type: "number", label: { en: "Area" } });
    const crops = q({ type: "repeatable_group", label: { en: "Crops" } });
    const served = new Map([[String(crop._id), crop]]);
    const known = new Set([crops, crop, area].map((x) => String(x._id)));
    const savedR1 = {
        rowId: "r1",
        answers: [stored(crop, "millet", [rice, millet]), stored(area, 5)],
    };
    // r2 sits first on purpose: matching rows by position would pair it with
    // the r1 that is resent first below.
    const savedCrops = stored(crops, [
        { rowId: "r2", answers: [stored(crop, "rice", [rice]), stored(area, 7)] },
        savedR1,
    ]);
    const ctx = { saved: savedCrops.value, known };
    // r1 as a form opened before the change resends it; r2 removed; r3 new.
    const resent = [
        {
            rowId: "r1",
            answers: [
                { questionId: crop._id, value: "millet" },
                { questionId: area._id, value: 99 },
            ],
        },
        { rowId: "r3", answers: [{ questionId: crop._id, value: "rice" }] },
    ];
    validateAnswer(crops, resent, served, 1, ctx);
    throws(
        () => validateAnswer(crops, resent, served, 1, { saved: savedCrops.value }),
        "an unserved field, with no list of known questions to excuse it"
    );
    throws(
        () =>
            validateAnswer(
                crops,
                [{ rowId: "r1", answers: [{ questionId: id(), value: 1 }] }],
                served,
                1,
                ctx
            ),
        "a row answer for a question that is not of this screen"
    );
    throws(
        () =>
            validateAnswer(
                crops,
                [{ rowId: "r3", answers: [{ questionId: crop._id, value: "millet" }] }],
                served,
                1,
                ctx
            ),
        "a removed option chosen in a new row"
    );

    const kept = snapshotAnswer(crops, resent, served, savedCrops).value;
    assert.deepStrictEqual(
        kept.map((row) => row.rowId),
        ["r1", "r3"],
        "a row the villager removed stays removed"
    );
    assert.deepStrictEqual(
        kept[0].answers[0].options,
        [rice, millet],
        "a row answer keeps its removed option's entry"
    );
    assert.strictEqual(
        kept[0].answers.length,
        2,
        "r1 holds what was served plus what was carried"
    );
    assert.strictEqual(
        kept[0].answers[1],
        savedR1.answers[1],
        "a hidden field's saved answer is carried forward, unchanged"
    );
    assert.strictEqual(kept[1].answers.length, 1, "a new row gets nothing carried");

    // The same one level down (Livestock -> Products): `output` is hidden and
    // the saved product row sits on the removed "millet".
    const product = q({ type: "text", label: { en: "Product" } });
    const output = q({ type: "number", label: { en: "Output" } });
    const products = q({ type: "repeatable_group", label: { en: "Products" } });
    products.childMap = new Map([product, crop].map((x) => [String(x._id), x]));
    const livestock = q({ type: "repeatable_group", label: { en: "Livestock" } });
    const inLivestock = new Map([[String(products._id), products]]);
    const savedOutput = stored(output, 9);
    const savedLivestock = stored(livestock, [
        {
            rowId: "l1",
            answers: [
                stored(products, [
                    {
                        rowId: "p1",
                        answers: [
                            stored(product, "Eggs"),
                            stored(crop, "millet", [rice, millet]),
                            savedOutput,
                        ],
                    },
                ]),
            ],
        },
    ]);
    const resentLivestock = [
        {
            rowId: "l1",
            answers: [
                {
                    questionId: products._id,
                    value: [
                        {
                            rowId: "p1",
                            answers: [
                                { questionId: product._id, value: "Eggs" },
                                { questionId: crop._id, value: "millet" },
                            ],
                        },
                    ],
                },
            ],
        },
    ];
    validateAnswer(livestock, resentLivestock, inLivestock, 1, {
        saved: savedLivestock.value,
    });
    throws(
        () => validateAnswer(livestock, resentLivestock, inLivestock),
        "a removed option in a nested row, with nothing saved to allow it"
    );
    assert.ok(
        snapshotAnswer(livestock, resentLivestock, inLivestock, savedLivestock)
            .value[0].answers[0].value[0].answers.includes(savedOutput),
        "a hidden field inside a nested group is carried forward too"
    );

    // answeredIds: two levels of nesting, and crop/area sit in two rows.
    assert.deepStrictEqual(
        collectAnsweredIds([savedSource, savedCrops, savedLivestock]).sort(),
        [source, crops, crop, area, livestock, products, product, output]
            .map((x) => String(x._id))
            .sort(),
        "answered ids are collected at every depth, once each"
    );

    // knownValues widens what validates (never what is offered): "b" was

    // switched off for this place, "z" was never an option.

    const narrowed = {

        _id: "narrowed",

        label: { en: "Narrowed" },

        type: "single_select",

        options: [{ value: "a", label: { en: "A" } }],

        knownValues: new Set(["a", "b"]),

        allOptions: [

            { value: "a", label: { en: "A" } },

            { value: "b", label: { en: "B" } },

        ],

    };

    validateAnswer(narrowed, "b");

    assert.throws(() => validateAnswer(narrowed, "z"));

    assert.deepStrictEqual(

        snapshotAnswer(narrowed, "b").options.map((o) => o.value),

        ["a", "b"]

    );

    // changedIn: the place whose wording was shown, at every depth, as an
    // ObjectId. A question nobody reworded has no such key at all — that is
    // what keeps the app's saved response as it was before places existed.
    const ladakh = id();
    const reworded = q({ type: "text", from: { label: String(ladakh), asked: String(id()) } });
    const plain = q({ type: "text", from: {} });
    assert.ok(snapshotAnswer(reworded, "x").changedIn.equals(ladakh));
    assert.ok(snapshotAnswer(reworded, "x").changedIn instanceof mongoose.Types.ObjectId);
    assert.strictEqual("changedIn" in snapshotAnswer(plain, "x"), false);
    assert.strictEqual("changedIn" in snapshotAnswer(q({ type: "text" }), "x"), false);
    const entries = q({ type: "repeatable_group", from: {} });
    const inRow = snapshotAnswer(
        entries,
        [
            {
                rowId: "r1",
                answers: [
                    { questionId: reworded._id, value: "x" },
                    { questionId: plain._id, value: "y" },
                ],
            },
        ],
        new Map([reworded, plain].map((x) => [String(x._id), x]))
    ).value[0].answers;
    assert.ok(inRow[0].changedIn.equals(ladakh));
    assert.strictEqual("changedIn" in inRow[1], false);

    {
        /* ---- rules that arrive after an entry was saved ---- */

        const crop = q({ type: "text", required: true });
        const area = q({ type: "number", required: true, min: 1 });
        const crops = q({ type: "repeatable_group" });
        const fields = new Map([crop, area].map((x) => [String(x._id), x]));
        const row = (rowId, ...answers) => ({ rowId, answers });
        const says = (question, value) => ({ questionId: question._id, value });
        const check = (rows, saved, complete) =>
            validateAnswer(crops, rows, fields, 1, { saved, complete });

        // Saved while "area" was not asked of it (hidden then, or added since):
        // the entry is resent as it is on every save and must not fail them all.
        const before = [row("r1", says(crop, "Rice"))];
        assert.doesNotThrow(() => check([row("r1", says(crop, "Rice"))], before));
        // A new entry is checked in full, and so is a field the entry did have.
        assert.throws(() => check([row("r2", says(crop, "Maize"))], before), /is required/);
        assert.throws(
            () => check([row("r1", says(area, 3))], [row("r1", says(crop, "Rice"), says(area, 3))]),
            /is required/
        );
        // A number saved before the range was tightened stays valid as it is,
        // and is checked again the moment it is changed.
        const low = [row("r1", says(crop, "Rice"), says(area, 0))];
        assert.doesNotThrow(() => check([row("r1", says(crop, "Rice"), says(area, 0))], low));
        assert.throws(() => check([row("r1", says(crop, "Rice"), says(area, 0.5))], low), /at least 1/);
        assert.throws(() => check([row("r3", says(crop, "Tea"), says(area, 0))], low), /at least 1/);

        // What only a hand-made request holds: an entry that is not an object, a
        // question answered twice in one row, a section "answered" with a blank.
        assert.throws(() => check([row("r1", null)]), /invalid answer/);
        assert.throws(
            () => check([row("r1", says(crop, "Rice"), says(crop, "Tea"), says(area, 2))]),
            /twice/
        );
        assert.throws(() => validateAnswer(q({ type: "section" }), ""), /is a section/);
        assert.throws(() => validateAnswer(q({ type: "date" }), 0), /valid date/);
        assert.throws(() => validateAnswer(q({ type: "date" }), false), /valid date/);
        assert.doesNotThrow(() => validateAnswer(q({ type: "date" }), "2026-10-08"));

        // A field hidden, then shown again, while a form opened in between
        // is still on screen: that form cannot send it, and must not erase it.
        const hiddenNow = new Map([[String(crop._id), crop]]);
        const carry1 = { was: new Set(), now: new Set() };
        const full = [row("r1", says(crop, "Rice"), says(area, 5))];
        const whileHidden = snapshotAnswer(
            crops,
            [row("r1", says(crop, "Rice"))],
            hiddenNow,
            { value: snapshotAnswer(crops, full, fields).value },
            carry1
        );
        const areaOf = (snapshot, index = 0) =>
            snapshot.value[index].answers.find(
                (answer) => String(answer.questionId) === String(area._id)
            )?.value;
        assert.strictEqual(areaOf(whileHidden), 5);
        assert.deepStrictEqual([...carry1.now], [String(area._id)]);
        // Shown again; the stale form adds an entry and still sends no area.
        const carry2 = { was: carry1.now, now: new Set(carry1.now) };
        const staleRows = [row("r1", says(crop, "Rice")), row("r2", says(crop, "Tea"))];
        assert.doesNotThrow(() =>
            validateAnswer(crops, staleRows, fields, 1, {
                saved: whileHidden.value,
                carried: carry2.was,
            })
        );
        const afterStale = snapshotAnswer(crops, staleRows, fields, whileHidden, carry2);
        assert.strictEqual(areaOf(afterStale), 5);
        assert.strictEqual(areaOf(afterStale, 1), undefined);
        assert.deepStrictEqual([...carry2.now], [String(area._id)]);
        // A form that WAS served the field sends it; from then on leaving it
        // out of an entry clears it there, as ever.
        const carry3 = { was: carry2.now, now: new Set(carry2.now) };
        const fresh = snapshotAnswer(
            crops,
            [row("r1", says(crop, "Rice")), row("r2", says(crop, "Tea"), says(area, 2))],
            new Map([[String(crop._id), crop], [String(area._id), { ...area, required: false }]]),
            afterStale,
            carry3
        );
        assert.strictEqual(areaOf(fresh), undefined);
        assert.strictEqual(areaOf(fresh, 1), 2);
        assert.deepStrictEqual([...carry3.now], []);
        // Never carried, simply left out: cleared, and nothing is recorded.
        const carry4 = { was: new Set(), now: new Set() };
        assert.strictEqual(
            areaOf(snapshotAnswer(crops, [row("r1", says(crop, "Rice"))], new Map([[String(crop._id), crop], [String(area._id), { ...area, required: false }]]), { value: snapshotAnswer(crops, full, fields).value }, carry4)),
            undefined
        );
        assert.deepStrictEqual([...carry4.now], []);

        // The minimum number of rows is asked for on Submit, not on a draft save
        // or by a list page saving itself.
        const atLeastTwo = q({ type: "repeatable_group", min: 2 });
        const one = [row("r1", says(crop, "Rice"), says(area, 2))];
        assert.throws(() => validateAnswer(atLeastTwo, one, fields, 1, {}), /at least 2 row/);
        assert.throws(() => validateAnswer(atLeastTwo, one, fields, 1, { complete: true }), /at least 2 row/);
        assert.doesNotThrow(() => validateAnswer(atLeastTwo, one, fields, 1, { complete: false }));

        // A blank inside a row is no answer: not stored, so it locks nothing.
        const note = q({ type: "text" });
        const withNote = new Map([crop, note].map((x) => [String(x._id), x]));
        assert.deepStrictEqual(
            snapshotAnswer(crops, [row("r1", says(crop, "Rice"), says(note, ""))], withNote)
                .value[0].answers.map((answer) => String(answer.questionId)),
            [String(crop._id)]
        );
    }

    {
        /* ---- photo and audio: a list of file ids ---- */

        const a = "66f0a1b2c3d4e5f601234560";
        const b = "66f0a1b2c3d4e5f601234561";
        const c = "66f0a1b2c3d4e5f601234562";
        const photo = (over) => q({ type: "photo", label: { en: "Photo" }, ...over });
        const check = (question, value, given) =>
            validateAnswer(question, value, new Map(), 1, given);

        assert.doesNotThrow(() => check(photo(), [a]));
        assert.doesNotThrow(() => check(q({ type: "audio", max: 2 }), [a, b]));
        // No `max` is one file.
        assert.throws(() => check(photo(), [a, b]), /at most 1 file/);
        assert.throws(() => check(photo({ max: 3 }), a), /list of files/);
        assert.throws(() => check(photo({ max: 3 }), ["uploads/1.png"]), /not a file/);
        assert.throws(() => check(photo({ max: 3 }), [a, { id: b }]), /not a file/);
        assert.throws(() => check(photo({ max: 3 }), [a, a]), /twice/);
        assert.throws(() => check(photo({ max: 3 }), [a, a.toUpperCase()]), /twice/);
        assert.throws(() => check(photo({ required: true }), []), /is required/);
        assert.doesNotThrow(() => check(photo(), []));

        // `max` lowered from 3 to 1 after three were saved: the answer stays
        // valid as it is (in any order, in either case), and is measured
        // again the moment it changes, even when a file is only taken away.
        assert.doesNotThrow(() => check(photo({ max: 1 }), [a, b, c], { saved: [c, b, a] }));
        assert.doesNotThrow(() =>
            check(photo({ max: 1 }), [a.toUpperCase(), b, c], { saved: [c, b, a] })
        );
        assert.throws(
            () => check(photo({ max: 1 }), [a, b], { saved: [a, b, c] }),
            /at most 1 file/
        );

        // With the files the caller may use: a new id has to be one of them,
        // the caller's own, and of the kind the question takes.
        const files = new Map([
            [a, { kind: "photo", mine: true }],
            [b, { kind: "audio", mine: true }],
            [c, { kind: "photo", mine: false }],
        ]);
        const missing = /a file could not be found\. Add it again\./;
        assert.doesNotThrow(() => check(photo(), [a], { files }));
        assert.doesNotThrow(() => check(photo(), [a.toUpperCase()], { files }));
        assert.doesNotThrow(() => check(q({ type: "audio" }), [b], { files }));
        assert.throws(() => check(photo(), [b], { files }), missing, "a recording as a photo");
        assert.throws(() => check(photo(), [c], { files }), missing, "somebody else's file");
        assert.throws(
            () => check(photo(), ["66f0a1b2c3d4e5f601234569"], { files }),
            missing,
            "no such file"
        );
        assert.throws(() => check(photo(), [a], { files: new Map() }), missing);
        // What the answer already held was checked when it was saved, and is
        // not looked for again; what joins it is.
        assert.doesNotThrow(() => check(photo({ max: 2 }), [c, a], { saved: [c], files }));
        assert.throws(() => check(photo({ max: 2 }), [c, b], { saved: [c], files }), missing);
        // No Map at all: only the shape is checked.
        assert.doesNotThrow(() => check(photo(), [c]));

        // Inside a list entry: the same rule, each entry against ITS files.
        const picture = photo({ required: true, max: 2 });
        const houses = q({ type: "repeatable_group", label: { en: "Houses" } });
        const fields = new Map([[String(picture._id), picture]]);
        const row = (rowId, value) => ({
            rowId,
            answers: value ? [{ questionId: picture._id, value }] : [],
        });
        assert.doesNotThrow(() => validateAnswer(houses, [row("r1", [a, b])], fields));
        assert.throws(() => validateAnswer(houses, [row("r1")], fields), /is required in/);
        assert.doesNotThrow(() => validateAnswer(houses, [row("r1", [a])], fields, 1, { files }));
        assert.throws(
            () => validateAnswer(houses, [row("r1", [a, b])], fields, 1, { files }),
            missing
        );
        const savedRows = [{ rowId: "r1", answers: [stored(picture, [c])] }];
        assert.doesNotThrow(() =>
            validateAnswer(houses, [row("r1", [c])], fields, 1, { saved: savedRows, files })
        );
        assert.throws(
            () =>
                validateAnswer(houses, [row("r1", [c]), row("r2", [c])], fields, 1, {
                    saved: savedRows,
                    files,
                }),
            missing,
            "a file one entry holds is new to another entry"
        );

        // Stored as sent, in lower case, with nothing but the ids.
        const frozen = snapshotAnswer(houses, [row("r1", [a, b.toUpperCase()])], fields)
            .value[0].answers[0];
        assert.deepStrictEqual(frozen.value, [a, b]);
        assert.strictEqual(frozen.type, "photo");
        assert.deepStrictEqual(frozen.options, []);
        assert.deepStrictEqual(snapshotAnswer(photo(), [a.toUpperCase()]).value, [a]);
        // A file id is not a row: only the question counts as answered.
        assert.deepStrictEqual(collectAnsweredIds([snapshotAnswer(picture, [a])]), [
            String(picture._id),
        ]);

        // A build that cannot answer photos is not served the field
        // (servedTo in utils/questionTree.js), so to this file it is a hidden
        // one: the required photo is not asked of that build's entries, old
        // or new, and what a newer build saved rides along.
        const name = q({ type: "text", required: true });
        const both = new Map([name, picture].map((x) => [String(x._id), x]));
        const older = new Map([[String(name._id), name]]);
        const onPage = new Set([houses, name, picture].map((x) => String(x._id)));
        const named = (rowId, text, ...more) => ({
            rowId,
            answers: [{ questionId: name._id, value: text }, ...more],
        });
        const savedHouses = snapshotAnswer(
            houses,
            [named("r1", "Home", { questionId: picture._id, value: [a] })],
            both
        );
        const again = [named("r1", "Home"), named("r2", "Barn")];
        assert.doesNotThrow(() =>
            validateAnswer(houses, again, older, 1, {
                saved: savedHouses.value,
                known: onPage,
            })
        );
        const carry = { was: new Set(), now: new Set() };
        const after = snapshotAnswer(houses, again, older, savedHouses, carry);
        assert.deepStrictEqual(
            after.value[0].answers.map((answer) => answer.value),
            ["Home", [a]]
        );
        assert.strictEqual(after.value[1].answers.length, 1);
        assert.deepStrictEqual([...carry.now], [String(picture._id)]);
    }

    console.log("answerValidator: all checks passed");
}

if (require.main === module) demo();
