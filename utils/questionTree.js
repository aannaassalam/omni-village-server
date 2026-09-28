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

module.exports = { childrenOf, rowQuestions, isTopLevel, groupDepth };

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
    console.log("questionTree: all checks passed");
}
