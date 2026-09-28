const mongoose = require("mongoose");
const AppError = require("../AppError");
const { localise } = require("./localised");

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
 */
const validateAnswer = (question, value, children = new Map(), depth = 1) => {
    const label = localise(question.label);

    // Depth is checked before the empty-value shortcut below: an over-nested
    // group that happens to have no rows is still an over-nested group.
    if (question.type === "repeatable_group" && depth > MAX_GROUP_DEPTH) {
        bad(`"${label}" is nested deeper than ${MAX_GROUP_DEPTH} levels`);
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
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) bad(`"${label}" must be a valid date`);
            return;
        }

        case "single_select": {
            const allowed = (question.options || []).map((o) => o.value);
            if (!allowed.includes(value)) {
                bad(`"${value}" is not an option for "${label}"`);
            }
            return;
        }

        case "multi_select": {
            if (!Array.isArray(value)) bad(`"${label}" must be a list`);
            const allowed = (question.options || []).map((o) => o.value);
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

        case "section": {
            // A section is presentational: it groups its children in the UI but
            // holds no value, and never appears in a stored response.
            bad(`"${label}" is a section and cannot be answered directly`);
            return;
        }

        case "repeatable_group": {
            if (!Array.isArray(value)) bad(`"${label}" must be a list of rows`);

            const minRows = question.min ?? 0;
            const maxRows = question.max ?? DEFAULT_MAX_ROWS;
            if (value.length < minRows) bad(`"${label}" needs at least ${minRows} row(s)`);
            if (value.length > maxRows) bad(`"${label}" allows at most ${maxRows} row(s)`);

            const seenRowIds = new Set();
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

                // Rows bind to children by questionId ONLY — never by position.
                row.answers.forEach((answer) => {
                    const child = children.get(String(answer.questionId));
                    if (!child) {
                        bad(
                            `Unknown question ${answer.questionId} in "${label}" row`
                        );
                    }
                    validateAnswer(
                        child,
                        answer.value,
                        child.childMap || new Map(),
                        depth + 1
                    );
                });

                // Required children missing from the row are caught here rather
                // than silently stored as absent.
                children.forEach((child) => {
                    if (!child.required) return;
                    const present = row.answers.some(
                        (a) => String(a.questionId) === String(child._id)
                    );
                    if (!present) bad(`"${localise(child.label)}" is required in "${label}"`);
                });
            });
            return;
        }

        default:
            bad(`Unsupported question type "${question.type}"`);
    }
};

/**
 * Freezes the answer: label/type/options are copied in, recursively, so each
 * child answer inside a row carries its OWN snapshot. Nothing in a stored row
 * references a child by position.
 */
const snapshotAnswer = (question, value, children = new Map()) => {
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
    };

    if (question.type !== "repeatable_group") {
        return {
            ...base,
            value: question.type === "date" && value ? new Date(value) : value,
        };
    }

    const rows = (value || []).map((row) => ({
        rowId: row.rowId || new mongoose.Types.ObjectId().toString(),
        answers: row.answers.map((answer) => {
            const child = children.get(String(answer.questionId));
            return snapshotAnswer(child, answer.value, child.childMap || new Map());
        }),
    }));

    return { ...base, value: rows };
};

/**
 * Mechanically-detectable structural changes only. The judgement case — an
 * option label whose MEANING shifted ("3-5 people" -> "3-4 people") keeps the
 * same `value` and is invisible here by design; the dashboard asks the human.
 */
const diffIsStructural = (oldQuestion, patch) => {
    if (patch.type !== undefined && patch.type !== oldQuestion.type) {
        return "Changing a question's type is always structural";
    }
    if (patch.options !== undefined) {
        const oldValues = (oldQuestion.options || []).map((o) => o.value);
        const newValues = patch.options.map((o) => o.value);
        // Adding and removing options is cosmetic (responses snapshot their
        // options). Renaming an option's identity key is not.
        const renamed =
            oldValues.some((v) => !newValues.includes(v)) &&
            newValues.some((v) => !oldValues.includes(v));
        if (renamed) {
            return "An option's value key changed — that is a new question";
        }
    }
    return null;
};

module.exports = {
    validateAnswer,
    snapshotAnswer,
    diffIsStructural,
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

    // structural vs cosmetic
    assert.ok(
        diffIsStructural({ type: "single_select", options: opts }, { type: "multi_select" }),
        "type change is structural"
    );
    assert.strictEqual(
        diffIsStructural(
            { type: "single_select", options: opts },
            { options: [{ value: "well", label: "Borewell" }, { value: "tap", label: "Tap" }] }
        ),
        null,
        "renaming an option label is cosmetic"
    );
    assert.strictEqual(
        diffIsStructural(
            { type: "single_select", options: opts },
            { options: [{ value: "well", label: "Well" }] }
        ),
        null,
        "removing an option is cosmetic"
    );
    assert.ok(
        diffIsStructural(
            { type: "single_select", options: opts },
            { options: [{ value: "borewell", label: "Borewell" }, { value: "tap", label: "Tap" }] }
        ),
        "changing an option's value key is structural"
    );

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

    console.log("answerValidator: all checks passed");
}

if (require.main === module) demo();
