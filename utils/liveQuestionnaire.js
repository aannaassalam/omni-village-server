const Categories = require("../Models/categories");
const Questions = require("../Models/questions");
const PlaceOverrides = require("../Models/placeOverrides");
const { resolve } = require("./effectiveQuestionnaire");
const { listShape } = require("./questionTree");
const { categoryFilter } = require("./audience");
const {
    listPlaces,
    chainOf,
    subtreeIds,
    canEditIn,
    assertCanEdit,
} = require("./places");

/**
 * Loads what the resolver needs and runs it.
 *
 * utils/effectiveQuestionnaire.js is pure so it can be checked without a
 * database; this is the one place that feeds it. The app's three endpoints
 * and the dashboard editor all come through here, so "which documents count"
 * is decided once.
 *
 * `audience` is whose questionnaire: the villagers' unless the field
 * officers' is asked for (utils/audience.js). The two never mix, and this is
 * where they are kept apart: only that audience's categories are read, and
 * only the questions on them are handed on. So nothing that reads through
 * here, the app's endpoints least of all, can be given a page of the other.
 * (The resolver stays blind to it. It already drops a question whose page it
 * was not given; the questions are narrowed here for the callers that read
 * the stored documents themselves: the editor's pending rows, the submit.)
 *
 * `categoryId` narrows the QUESTIONS to one page. Categories are always all
 * read: a page is asked only if everything above it is. `fields` narrows what
 * is read of each question — the app's home screen only counts them, and one
 * seeded question carries 155 options. It has to keep `categoryId`.
 *
 * What the places on `chain` changed is read with it; the Master itself (no
 * chain) has nothing to read. `overridePlaces` names further places whose
 * overrides come back in `overrides` without counting for this chain — the
 * resolver skips a place that is not on it. The editor asks for the places
 * INSIDE the one it shows, whose pending changes it lists.
 *
 * ponytail: with no `categoryId` every question of BOTH audiences is read and
 * one audience's kept. Fine for the few hundred there are; give questions
 * their page's audience if that read ever shows up.
 */
const loadEffective = async ({
    audience = "villager",
    chain = [],
    drafts = new Set(),
    categoryId,
    fields,
    overridePlaces = [],
} = {}) => {
    const questionQuery = Questions.find(categoryId ? { categoryId } : {});
    if (fields) questionQuery.select(fields);

    const [categories, everyQuestion, overrides] = await Promise.all([
        Categories.find(categoryFilter(audience)).lean(),
        questionQuery.lean(),
        chain.length > 0
            ? PlaceOverrides.find({
                  placeId: { $in: [...chain, ...overridePlaces] },
              }).lean()
            : [],
    ]);
    const pages = new Set(categories.map((category) => String(category._id)));
    const questions = everyQuestion.filter((question) =>
        pages.has(String(question.categoryId))
    );

    return {
        categories,
        questions,
        overrides,
        resolved: resolve({ chain, categories, questions, overrides, drafts }),
    };
};

/**
 * The dashboard's view of ONE place's questionnaire, for an account that may
 * change that place (anyone else is refused here: 403, or 404 for no such
 * place).
 *
 * Unpublished work shows for every place on the chain this account may
 * change — a super admin all of them, a regional account from its own place
 * down — and never the Master's: a place is asked the Master as published.
 *
 * `places` saves the read when the caller has them; `subtree` also brings
 * the overrides of the places inside this one.
 *
 * Always the villagers' questionnaire: the officers' is the Master's alone,
 * and no place has a version of it.
 */
const loadPlaceView = async (admin, placeId, { places, subtree } = {}) => {
    const all = places || (await listPlaces());
    const place = assertCanEdit(admin, placeId, all);
    const chain = chainOf(place);
    const editable = chain.filter(canEditIn(admin, all));
    const drafts = new Set(editable.map(String));

    const loaded = await loadEffective({
        chain,
        drafts,
        overridePlaces: subtree
            ? subtreeIds(place._id, all).filter(
                  (id) => String(id) !== String(place._id)
              )
            : [],
    });

    return { ...loaded, places: all, place, chain, editable, drafts };
};

/**
 * The same view with the place's OWN overrides taken out: what it would be
 * asked had it changed nothing itself. That is what "inherited" means, and
 * what a change is measured against when deciding whether it changes
 * anything. (What the place ADDED stays: a question is not an override.)
 */
const inheritedView = ({ place, chain, categories, questions, overrides, drafts }) =>
    resolve({
        chain,
        categories,
        questions,
        overrides: overrides.filter(
            (override) => String(override.placeId) !== String(place._id)
        ),
        drafts,
    });

/**
 * Whether one page is a list in this view (utils/questionTree.js listShape),
 * judged by each question's own switch. A hidden page keeps its shape: it
 * must still be a list on the day it is shown again.
 */
const listPage = (resolved, categoryId) =>
    listShape(
        [...resolved.questions.values()].filter(
            (question) =>
                question.selfAsked &&
                String(question.categoryId) === String(categoryId)
        )
    );

module.exports = { loadEffective, loadPlaceView, inheritedView, listPage };
