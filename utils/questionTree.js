/**
 * Where a question's ANSWER lives, given that sections are presentational.
 *
 * A section holds no value: its children are answered wherever the section
 * itself sits. So a section at the top of a screen puts its children at the
 * top level of the response, and a section inside a repeatable group puts
 * them in that group's rows. Every reader of the question tree asks here, so
 * the app, the submit handler and the dashboard columns cannot disagree.
 */
const { FILE_TYPES } = require("./fileKinds");

const same = (a, b) => String(a) === String(b);

const childrenOf = (parent, all) =>
    all
        .filter((question) => same(question.parentQuestionId, parent._id))
        .sort((a, b) => (a.order || 0) - (b.order || 0));

/** What one row of `group` can answer, looking inside its sections. */
const rowQuestions = (group, all) =>
    childrenOf(group, all).flatMap((child) =>
        child.type === "section"
            ? childrenOf(child, all).map((inner) => ({
                  ...inner,
                  section: child.label,
              }))
            : [child]
    );

/** True when the question is answered at the top level of a response. */
const isTopLevel = (question, byId) => {
    if (question.type === "section") return false;
    if (!question.parentQuestionId) return true;
    const parent = byId.get(String(question.parentQuestionId));
    return parent?.type === "section" && !parent.parentQuestionId;
};

/** How many repeatable groups enclose `question`, itself included. */
const groupDepth = (question, byId) => {
    let depth = 0;
    let current = question;
    const seen = new Set();
    while (current && !seen.has(String(current._id))) {
        seen.add(String(current._id));
        if (current.type === "repeatable_group") depth += 1;
        current = current.parentQuestionId
            ? byId.get(String(current.parentQuestionId))
            : null;
    }
    return depth;
};

/**
 * The field that names each entry of `group`: its first one that is not a
 * photo or a recording, because a file id is no name. null when there is no
 * such field (an empty list, or one that holds nothing but files).
 */
const namingField = (group, questions) =>
    rowQuestions(group, questions).find(
        (field) => !FILE_TYPES.includes(field.type)
    ) || null;

/**
 * A page whose ONLY top-level question is a repeatable group is drawn by the
 * app as a list of entries (crops, livestock, food), and each entry is named
 * by its first field (see namingField). The app decides both from the
 * questions it is served, so `questions` are one page's AS ASKED: what is
 * switched off is left out.
 *
 * Returns `{ group, naming }`, or null for an ordinary page. Two things
 * follow from it for a place: a question it adds goes inside `group`, and
 * `naming` cannot be switched off.
 */
const listShape = (questions) => {
    const top = questions.filter((question) => !question.parentQuestionId);
    if (top.length !== 1 || top[0].type !== "repeatable_group") return null;
    return {
        group: top[0],
        naming: namingField(top[0], questions),
    };
};

/**
 * What a place cannot switch off on a page: the field that names each entry
 * of a list — the naming field of every top-level repeatable group — and the
 * section holding that field, when one does. Ids, as strings.
 *
 * Deliberately NOT only on a page that is one list today: a page with a
 * second question becomes a plain list the day that question is hidden,
 * here or in a place below, and its entries would then have no names.
 * `questions` are one page's as asked, like listShape's.
 */
const namingIds = (questions) => {
    const ids = new Set();
    questions
        .filter(
            (question) =>
                !question.parentQuestionId &&
                question.type === "repeatable_group"
        )
        .forEach((group) => {
            const first = namingField(group, questions);
            if (!first) return;
            ids.add(String(first._id));
            if (!same(first.parentQuestionId, group._id)) {
                ids.add(String(first.parentQuestionId));
            }
        });
    return ids;
};

/**
 * What of `questions` (as asked) a caller is served, when its build of the
 * app can answer only the file types in `types` (a Set: answerTypesOf in
 * utils/fileKinds.js). A photo or audio question it cannot answer is left
 * out, and with it a section or a list that is then left with nothing to
 * ask, as when a place hides everything inside one.
 *
 * For that caller such a question is one that is hidden: not served, not
 * counted, not required, and absent from what it was asked. So a required
 * photo cannot lock an older build out of a page or of adding to a list, and
 * what a newer build saved for it rides along untouched.
 */
const servedTo = (questions, types) => {
    let served = questions.filter(
        (question) =>
            !FILE_TYPES.includes(question.type) || types.has(question.type)
    );
    // Then what that emptied, and again while anything goes: a list may
    // have held nothing but the section that held the photo.
    let before;
    do {
        before = served.length;
        const holding = new Set(
            served.map((question) => String(question.parentQuestionId))
        );
        served = served.filter(
            (question) =>
                (question.type !== "section" &&
                    question.type !== "repeatable_group") ||
                holding.has(String(question._id))
        );
    } while (served.length < before);
    return served;
};

module.exports = {
    childrenOf,
    rowQuestions,
    isTopLevel,
    groupDepth,
    listShape,
    namingIds,
    servedTo,
};

/* Self-check: node utils/questionTree.js */
if (require.main === module) {
    const assert = require("assert");
    const q = (_id, type, parentQuestionId = null, order = 0) => ({
        _id,
        type,
        parentQuestionId,
        order,
        label: { en: _id },
    });
    const all = [
        q("area", "number"),
        q("sub", "section"),
        q("sub.trees", "number", "sub"),
        q("crops", "repeatable_group"),
        q("crop", "single_select", "crops", 1),
        q("use", "section", "crops", 2),
        q("use.eaten", "number", "use", 1),
        q("use.sold", "number", "use", 2),
        q("products", "repeatable_group", "crops", 3),
        q("product.name", "text", "products"),
    ];
    const byId = new Map(all.map((x) => [x._id, x]));
    const ids = (list) => list.map((x) => x._id);

    assert.deepStrictEqual(ids(rowQuestions(byId.get("crops"), all)), [
        "crop",
        "use.eaten",
        "use.sold",
        "products",
    ]);
    assert.deepStrictEqual(
        rowQuestions(byId.get("crops"), all)[1].section,
        { en: "use" }
    );
    assert.deepStrictEqual(ids(all.filter((x) => isTopLevel(x, byId))), [
        "area",
        "sub.trees",
        "crops",
    ]);
    assert.strictEqual(groupDepth(byId.get("products"), byId), 2);
    assert.strictEqual(groupDepth(byId.get("use.eaten"), byId), 1);

    // A page with a number, a section and a group at the top is a form.
    assert.strictEqual(listShape(all), null);
    // With only the group left it is a list, named by the group's first field.
    const onlyCrops = all.filter((x) => !["area", "sub", "sub.trees"].includes(x._id));
    assert.strictEqual(listShape(onlyCrops).group._id, "crops");
    assert.strictEqual(listShape(onlyCrops).naming._id, "crop");
    // The first field may sit in a section: it is still what names the entry.
    assert.strictEqual(
        listShape(onlyCrops.filter((x) => x._id !== "crop")).naming._id,
        "use.eaten"
    );
    // A group with anything beside it is a form, whichever comes first.
    assert.strictEqual(
        listShape([q("crops", "repeatable_group"), q("area", "number")]),
        null
    );
    // What names the entries is the same field on a form as on a list: the
    // page turns into a list the day the questions beside the group go.
    assert.deepStrictEqual([...namingIds(all)], ["crop"]);
    assert.deepStrictEqual([...namingIds(onlyCrops)], ["crop"]);
    // In a section, the section is held too: hiding it hides the field.
    assert.deepStrictEqual(
        [...namingIds(all.filter((x) => x._id !== "crop"))].sort(),
        ["use", "use.eaten"]
    );
    // A nested group names its own entries inside one entry: not locked.
    assert.strictEqual(namingIds(all).has("products"), false);
    assert.deepStrictEqual([...namingIds([q("area", "number")])], []);
    // One top-level question that is not a group, or none at all: no list.
    assert.strictEqual(listShape([q("area", "number")]), null);
    assert.strictEqual(listShape([]), null);
    assert.strictEqual(listShape([q("crops", "repeatable_group")]).naming, null);

    /* ---- photo and audio fields ---- */

    // A file id is no name: a photo put first in a list does not name its
    // entries (the next field does), and so stays free to be switched off.
    const photoFirst = [...onlyCrops, q("picture", "photo", "crops", 0)];
    assert.strictEqual(rowQuestions(byId.get("crops"), photoFirst)[0]._id, "picture");
    assert.strictEqual(listShape(photoFirst).naming._id, "crop");
    assert.deepStrictEqual([...namingIds(photoFirst)], ["crop"]);
    // Behind a photo and a recording in a section, the first field that is
    // neither: its section is held with it, as before.
    const filesFirst = [
        ...onlyCrops.filter((x) => x._id !== "crop"),
        q("use.voice", "audio", "use", 0),
        q("picture", "photo", "crops", 0),
    ];
    assert.strictEqual(listShape(filesFirst).naming._id, "use.eaten");
    assert.deepStrictEqual([...namingIds(filesFirst)].sort(), ["use", "use.eaten"]);
    // A list that holds nothing but files has no naming field at all.
    const onlyFiles = [
        q("houses", "repeatable_group"),
        q("front", "photo", "houses", 1),
        q("story", "audio", "houses", 2),
    ];
    assert.strictEqual(listShape(onlyFiles).group._id, "houses");
    assert.strictEqual(listShape(onlyFiles).naming, null);
    assert.deepStrictEqual([...namingIds(onlyFiles)], []);

    // What a build is served. `page` is the form above plus a photo at the
    // top, a recording in the list, and a section and a list of only files.
    const page = [
        ...all,
        q("front", "photo"),
        q("crop.voice", "audio", "crops", 4),
        q("proof", "section"),
        q("proof.paper", "photo", "proof"),
        q("houses", "repeatable_group"),
        q("houses.inside", "section", "houses"),
        q("houses.inside.photo", "photo", "houses.inside"),
    ];
    const served = (...types) => ids(servedTo(page, new Set(types)));
    // A build that names both types is served everything, in the same order.
    assert.deepStrictEqual(served("photo", "audio"), ids(page));
    // An older build names none: no file question, and no section or list
    // that held nothing else (the list of houses goes with its section).
    assert.deepStrictEqual(served(), ids(all));
    // One type named: only the other one is left out. The list of crops
    // stays either way, it holds more than the recording.
    assert.deepStrictEqual(
        served("photo"),
        ids(page).filter((id) => id !== "crop.voice")
    );
    assert.deepStrictEqual(served("audio"), [...ids(all), "crop.voice"]);
    // Nothing but files on a page: an older build is served nothing there.
    assert.deepStrictEqual(servedTo(onlyFiles, new Set()), []);
    assert.deepStrictEqual(servedTo([], new Set()), []);
    console.log("questionTree: all checks passed");
}
