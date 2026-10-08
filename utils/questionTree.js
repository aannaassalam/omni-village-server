/**
 * Where a question's ANSWER lives, given that sections are presentational.
 *
 * A section holds no value: its children are answered wherever the section
 * itself sits. So a section at the top of a screen puts its children at the
 * top level of the response, and a section inside a repeatable group puts
 * them in that group's rows. Every reader of the question tree asks here, so
 * the app, the submit handler and the dashboard columns cannot disagree.
 */
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
 * A page whose ONLY top-level question is a repeatable group is drawn by the
 * app as a list of entries (crops, livestock, food), and each entry is named
 * by its first field. The app decides both from the questions it is served,
 * so `questions` are one page's AS ASKED: what is switched off is left out.
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
        naming: rowQuestions(top[0], questions)[0] || null,
    };
};

/**
 * What a place cannot switch off on a page: the field that names each entry
 * of a list — the first field of every top-level repeatable group — and the
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
            const first = rowQuestions(group, questions)[0];
            if (!first) return;
            ids.add(String(first._id));
            if (!same(first.parentQuestionId, group._id)) {
                ids.add(String(first.parentQuestionId));
            }
        });
    return ids;
};

module.exports = {
    childrenOf,
    rowQuestions,
    isTopLevel,
    groupDepth,
    listShape,
    namingIds,
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
    console.log("questionTree: all checks passed");
}
