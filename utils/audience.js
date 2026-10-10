const AppError = require("../AppError");

/**
 * Who a part of the questionnaire is asked of.
 *
 * There are two questionnaires in the one set of collections: the villagers',
 * answered by each villager about their household, and the field officers'
 * (accounts in `moderators`), answered once per village by the officer that
 * village is assigned to. Every category says which it belongs to
 * (`categories.audience`); a question belongs where its page does and carries
 * nothing itself.
 *
 * Pure: `node utils/audience.js` checks it without a database.
 */
const AUDIENCES = ["villager", "officer"];

/**
 * Whose a category is. Everything that does not say "officer" is the
 * villagers': a category saved before the field existed has none, and every
 * reader is lean, so the schema's default never reaches it.
 */
const audienceOf = (category) =>
    category?.audience === "officer" ? "officer" : "villager";

/**
 * The Mongo filter for one audience's categories. Never `{ audience:
 * "villager" }`: that would miss every category saved before the field
 * existed, and hand the villagers an empty questionnaire.
 */
const categoryFilter = (audience) =>
    audience === "officer"
        ? { audience: "officer" }
        : { audience: { $ne: "officer" } };

/**
 * The audience a request names, from a query string or a body. None named is
 * the villagers', which is what every caller older than the officers'
 * questionnaire means.
 */
const parseAudience = (value) => {
    if (value === undefined) return "villager";
    if (!AUDIENCES.includes(value)) {
        throw new AppError(0, "Unknown audience", 400);
    }
    return value;
};

module.exports = { AUDIENCES, audienceOf, categoryFilter, parseAudience };

/* Self-check: node utils/audience.js */
if (require.main === module) {
    const assert = require("assert");

    assert.deepStrictEqual(AUDIENCES, ["villager", "officer"]);

    assert.strictEqual(audienceOf({ audience: "officer" }), "officer");
    assert.strictEqual(audienceOf({ audience: "villager" }), "villager");
    // Saved before the field existed, and read lean: no audience at all.
    assert.strictEqual(audienceOf({ title: { en: "Production" } }), "villager");
    assert.strictEqual(audienceOf({ audience: null }), "villager");
    // No such category (a question whose page is gone) is nobody's officer page.
    assert.strictEqual(audienceOf(null), "villager");
    assert.strictEqual(audienceOf(undefined), "villager");

    assert.deepStrictEqual(categoryFilter("officer"), { audience: "officer" });
    assert.deepStrictEqual(categoryFilter("villager"), {
        audience: { $ne: "officer" },
    });
    // The two filters split any list of categories in two, with nothing in
    // both and nothing in neither: checked the way Mongo would apply them.
    const matches = (filter, doc) =>
        typeof filter.audience === "string"
            ? doc.audience === filter.audience
            : doc.audience !== filter.audience.$ne;
    [{ audience: "officer" }, { audience: "villager" }, {}, { audience: null }].forEach(
        (doc) => {
            const officer = matches(categoryFilter("officer"), doc);
            const villager = matches(categoryFilter("villager"), doc);
            assert.notStrictEqual(officer, villager);
            // And the filter agrees with audienceOf about which one.
            assert.strictEqual(officer, audienceOf(doc) === "officer");
        }
    );

    assert.strictEqual(parseAudience(undefined), "villager");
    assert.strictEqual(parseAudience("villager"), "villager");
    assert.strictEqual(parseAudience("officer"), "officer");
    // Anything else is refused, not read as the villagers': a mistyped
    // audience must not publish into the other questionnaire.
    [null, "", "Officer", "officers", "master", 1, true, ["officer"], {}].forEach(
        (value) =>
            assert.throws(
                () => parseAudience(value),
                (error) =>
                    error instanceof AppError &&
                    error.statusCode === 400 &&
                    error.message === "Unknown audience"
            )
    );

    console.log("audience: all checks passed");
}
