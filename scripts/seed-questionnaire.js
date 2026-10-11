/**
 * Seeds the dynamic questionnaire from the EXISTING hardcoded collections, so
 * the app and dashboard start with the real census rather than a blank slate.
 *
 * Structure is introspected from the Mongoose schemas at run time rather than
 * transcribed by hand, so it stays faithful to what the backend actually
 * stores. Select options come from the existing *-dropdown collections, which
 * already carry real {en, ms, dz} translations.
 *
 *   node scripts/seed-questionnaire.js --dry-run   # print the tree, write nothing
 *   node scripts/seed-questionnaire.js             # create it
 *   node scripts/seed-questionnaire.js --reset     # wipe and recreate
 *   node scripts/seed-questionnaire.js --officer   # add the field officers' tree
 *
 * --reset refuses to run once any responses exist, because deleting a question
 * that has been answered breaks the questionId binding those answers rely on.
 * It also refuses once the questionnaire has been edited in the dashboard —
 * anything published (history), drafted, unpublished, added by a place, or
 * changed by a place for itself (place_overrides).
 *
 * --officer (alone or with --dry-run) adds the field officers' questionnaire,
 * written out in officer-screens.js, beside the villagers' and touches nothing
 * else. It refuses once an officer category exists and has no --reset of its
 * own, and it refuses while any option list it reads is empty (a picker with
 * no options could not be answered, and could not be seeded again); and
 * --reset refuses while the officers' tree or an officer's response
 * is there, because it wipes both collections whole. Deploy the code before
 * running it: a seeded category is live at once, and code from before the
 * officers' questionnaire serves every category to villagers.
 */
require("dotenv").config();
const mongoose = require("mongoose");

const connection_url = require("../Enviroment");
const Categories = require("../Models/categories");
const Questions = require("../Models/questions");
const History = require("../Models/questionnaireHistory");
const PlaceOverrides = require("../Models/placeOverrides");
const { categoryFilter } = require("../utils/audience");
const { countAnswers } = require("../utils/responseStores");
const {
    SKIP_FIELDS,
    SCREEN_SPLITS,
    DROPDOWN_TYPE_OVERRIDES,
    TYPE_OVERRIDES,
    LABEL_OVERRIDES,
    TREE,
    DROPDOWN_MODELS,
} = require("./questionnaire-map");
const { loadAppTranslations } = require("./app-translations");
const { buildAppTree } = require("./app-screens");
const { buildOfficerTree } = require("./officer-screens");

const DRY_RUN = process.argv.includes("--dry-run");
const RESET = process.argv.includes("--reset");
const OFFICER = process.argv.includes("--officer");

const warnings = [];
const stats = { categories: 0, questions: 0, options: 0, translated: 0 };

// Real translations, from the app's i18next bundles. Null if the app repo
// is not checked out alongside this one.
const appTranslations = loadAppTranslations();

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

const ABBREVIATIONS = {
    avg: "average",
    no: "number",
    qty: "quantity",
    info: "information",
    yr: "year",
};

const humanise = (field) => {
    if (LABEL_OVERRIDES[field]) return LABEL_OVERRIDES[field];
    // "crop_id" reads as "Crop", not "Crop id" — the id is an implementation
    // detail of the old schema, not part of the question.
    const words = field
        .replace(/_id$/, "")
        .split(/[._]/)
        .filter(Boolean)
        .map((word) => ABBREVIATIONS[word] || word);
    const sentence = words.join(" ");
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
};

/** Nested single objects read better as "Parent — Child". */
const labelForPath = (path) => {
    if (LABEL_OVERRIDES[path]) return LABEL_OVERRIDES[path];
    if (!path.includes(".")) return humanise(path);
    const [head, ...rest] = path.split(".");
    return `${humanise(head)} — ${humanise(rest.join("."))}`;
};

/**
 * Turns an English label into a localised object, adopting the app's real
 * wording AND its translations when the two refer to the same thing. The app
 * only covers production/consumption, so census labels stay English-only.
 */
const localisedLabel = (englishLabel) => {
    const match = appTranslations?.lookup(englishLabel);
    if (!match) return { en: englishLabel };
    stats.translated += 1;
    return { ...match };
};

/* ------------------------------------------------------------------ */
/* Dropdown option resolution                                          */
/* ------------------------------------------------------------------ */

const STOP_WORDS = new Set(["of", "the", "a", "for", "to", "in", "and", "other"]);

const tokenise = (value) =>
    value
        .toLowerCase()
        .replace(/[^a-z]+/g, " ")
        .trim()
        .split(" ")
        .filter((word) => word && !STOP_WORDS.has(word))
        .map((word) => word.replace(/ies$/, "y").replace(/s$/, ""));

const similarity = (a, b) => {
    const left = new Set(tokenise(a));
    const right = new Set(tokenise(b));
    if (!left.size || !right.size) return 0;
    let shared = 0;
    left.forEach((token) => {
        if (right.has(token)) shared += 1;
    });
    return shared / Math.max(left.size, right.size);
};

/**
 * Resolves which dropdown `type` backs a field: explicit override first, then
 * a confident fuzzy match. Anything below the threshold is reported rather
 * than guessed — a wrong option set is worse than none.
 */
const resolveDropdownType = (modelName, fieldPath, types) => {
    const overrides = DROPDOWN_TYPE_OVERRIDES[modelName] || {};
    if (overrides[fieldPath]) return { type: overrides[fieldPath], how: "override" };

    const leaf = fieldPath.split(".").pop();
    if (types.includes(fieldPath)) return { type: fieldPath, how: "exact" };
    if (types.includes(leaf)) return { type: leaf, how: "exact" };

    let best = null;
    let bestScore = 0;
    types.forEach((candidate) => {
        const score = similarity(fieldPath, candidate);
        if (score > bestScore) {
            bestScore = score;
            best = candidate;
        }
    });

    if (bestScore >= 0.5) return { type: best, how: `fuzzy ${bestScore.toFixed(2)}` };
    return { type: null, how: "unmatched", suggestion: best };
};

/* ------------------------------------------------------------------ */
/* Schema introspection                                                */
/* ------------------------------------------------------------------ */

const isObjectIdPath = (path) =>
    path.instance === "ObjectId" ||
    (path.$isMongooseArray && path.caster?.instance === "ObjectId");

const enumOf = (path) =>
    (path.enumValues && path.enumValues.length && path.enumValues) ||
    (path.caster?.enumValues?.length && path.caster.enumValues) ||
    null;

/** Maps one schema path onto a question definition. */
const questionFor = ({
    modelName,
    fieldPath,
    schemaPath,
    dropdownDocs,
    dropdownTypes,
    order,
}) => {
    const label = localisedLabel(labelForPath(fieldPath));
    const base = { label, order, required: false };
    const isArray = Boolean(schemaPath.$isMongooseArray);

    // Said outright in questionnaire-map.js, because the schema cannot: a
    // String that holds the path of a picture is a photo, not text. With no
    // `max` it takes one, as the old screen did.
    const fixedType = TYPE_OVERRIDES[modelName]?.[fieldPath];
    if (fixedType) return { ...base, type: fixedType };

    // Options from a *-dropdown collection
    if (isObjectIdPath(schemaPath) && dropdownTypes) {
        const { type, how, suggestion } = resolveDropdownType(
            modelName,
            fieldPath,
            dropdownTypes
        );
        if (!type) {
            warnings.push(
                `${modelName}.${fieldPath}: no dropdown type matched` +
                    (suggestion ? ` (closest: "${suggestion}")` : "")
            );
            return {
                ...base,
                type: isArray ? "multi_select" : "single_select",
                options: [],
            };
        }

        const options = (dropdownDocs[type] || []).map((doc) => ({
            value: String(doc._id),
            label: doc.name,
        }));
        if (options.length === 0) {
            warnings.push(
                `${modelName}.${fieldPath}: dropdown type "${type}" has no rows yet — question created with no options`
            );
        }
        stats.options += options.length;
        return {
            ...base,
            type: isArray ? "multi_select" : "single_select",
            options,
            _mapping: `${fieldPath} -> ${type} (${how}, ${options.length} options)`,
        };
    }

    // 3. A string enum is a select whose options are the enum itself
    const values = enumOf(schemaPath);
    if (values) {
        const options = values
            .filter(Boolean)
            .map((entry) => ({
                value: entry,
                label: localisedLabel(humanise(entry)),
            }));
        stats.options += options.length;
        return {
            ...base,
            type: isArray ? "multi_select" : "single_select",
            options,
        };
    }

    // 4. Plain scalars
    switch (schemaPath.instance) {
        case "Number":
        case "Decimal128":
            return { ...base, type: "number" };
        case "Boolean":
            return { ...base, type: "boolean" };
        case "Date":
            return { ...base, type: "date" };
        case "Array":
            return { ...base, type: "text" };
        default:
            return { ...base, type: "text" };
    }
};

/** Top-level paths of a schema, minus the bookkeeping ones. */
const usablePaths = (schema) =>
    Object.entries(schema.paths).filter(
        ([name]) => !SKIP_FIELDS.has(name) && !name.startsWith("_")
    );

/* ------------------------------------------------------------------ */
/* Building                                                            */
/* ------------------------------------------------------------------ */

const loadDropdowns = async (modelName) => {
    const dropdownModelFile = DROPDOWN_MODELS[modelName];
    if (!dropdownModelFile) return { docs: {}, types: null };

    let Model;
    try {
        Model = require(`../Models/${dropdownModelFile}`);
    } catch (err) {
        warnings.push(`${modelName}: dropdown model "${dropdownModelFile}" not found`);
        return { docs: {}, types: null };
    }

    const rows = await Model.find({}).select({ name: 1, type: 1 }).lean();
    const docs = {};
    rows.forEach((row) => {
        docs[row.type] = [...(docs[row.type] || []), row];
    });

    const types = Model.schema.path("type")?.enumValues || Object.keys(docs);
    return { docs, types };
};

/** Builds the question list for one screen. */
const buildQuestions = async (modelName, excludes = []) => {
    const Model = require(`../Models/${modelName}`);
    const { docs: dropdownDocs, types: dropdownTypes } = await loadDropdowns(
        modelName
    );
    const excluded = new Set(excludes);

    const questions = [];
    let order = 0;

    // A nested object in the schema (cultivation.utilization.*) is a SECTION:
    // the app already renders exactly these as accordions. Emitting them as one
    // section with children beats flattening them into "Parent — Child" labels.
    const sections = new Map();
    for (const [fieldPath] of usablePaths(Model.schema)) {
        if (!fieldPath.includes(".")) continue;
        if (excluded.has(fieldPath) || excluded.has(fieldPath.split(".")[0]))
            continue;
        const head = fieldPath.split(".")[0];
        sections.set(head, [...(sections.get(head) || []), fieldPath]);
    }
    const emittedSections = new Set();

    for (const [fieldPath, schemaPath] of usablePaths(Model.schema)) {
        if (excluded.has(fieldPath)) continue;
        if (excluded.has(fieldPath.split(".")[0])) continue;

        const head = fieldPath.split(".")[0];
        if (fieldPath.includes(".") && sections.has(head)) {
            if (emittedSections.has(head)) continue;
            emittedSections.add(head);
            order += 1;

            let childOrder = 0;
            const children = sections.get(head).map((childPath) => {
                childOrder += 1;
                return {
                    ...questionFor({
                        modelName,
                        fieldPath: childPath,
                        schemaPath: Model.schema.paths[childPath],
                        dropdownDocs,
                        dropdownTypes,
                        order: childOrder,
                    }),
                    label: localisedLabel(
                        humanise(childPath.split(".").slice(1).join("."))
                    ),
                };
            });

            questions.push({
                label: localisedLabel(humanise(head)),
                type: "section",
                order,
                required: false,
                options: [],
                children,
            });
            continue;
        }

        order += 1;

        // A DocumentArray is a repeatable group: its subpaths are the row fields.
        if (schemaPath.$isMongooseDocumentArray) {
            const children = [];
            let childOrder = 0;
            for (const [childName, childPath] of usablePaths(schemaPath.schema)) {
                childOrder += 1;
                children.push(
                    questionFor({
                        modelName,
                        fieldPath: `${fieldPath}.${childName}`,
                        schemaPath: childPath,
                        dropdownDocs,
                        dropdownTypes,
                        order: childOrder,
                    })
                );
            }
            questions.push({
                label: localisedLabel(labelForPath(fieldPath)),
                type: "repeatable_group",
                presentation: children.length > 3 ? "screen" : "inline",
                order,
                required: false,
                options: [],
                children: children.map((child) => ({
                    ...child,
                    label: localisedLabel(child.label.en.split(" — ").pop()),
                })),
            });
            continue;
        }

        questions.push(
            questionFor({
                modelName,
                fieldPath,
                schemaPath,
                dropdownDocs,
                dropdownTypes,
                order,
            })
        );
    }

    return questions;
};

const createQuestion = async (categoryId, definition, parentQuestionId = null) => {
    const { children, _mapping, ...rest } = definition;
    stats.questions += 1;

    const created = DRY_RUN
        ? null
        : await Questions.create({ ...rest, categoryId, parentQuestionId });

    for (const child of children || []) {
        await createQuestion(categoryId, child, created?._id || null);
    }
    return created;
};

/** `title` is English (looked up in the app's bundles) or already localised. */
const createCategory = async ({ title, description, parent, isScreen, order }) => {
    const path = parent ? [...(parent.path || []), parent._id] : [];
    stats.categories += 1;
    if (DRY_RUN) {
        return { _id: `dry-${stats.categories}`, path, depth: path.length };
    }
    return Categories.create({
        title: typeof title === "string" ? localisedLabel(title) : title,
        ...(description ? { description } : {}),
        // An --officer run creates the officers' tree and nothing else, so
        // every category of it is theirs. Without the flag the model's own
        // default applies: the villagers'.
        ...(OFFICER ? { audience: "officer" } : {}),
        parentId: parent ? parent._id : null,
        path,
        depth: path.length,
        is_screen: Boolean(isScreen),
        order,
    });
};

/** Numbers a hand-written question list by position, all the way down. */
const inOrder = (questions) =>
    questions.map((question, index) => {
        stats.options += (question.options || []).length;
        return {
            required: false,
            options: [],
            ...question,
            order: index + 1,
            ...(question.children
                ? { children: inOrder(question.children) }
                : {}),
        };
    });

/**
 * A tree written out by hand to mirror the app: Production and Consumption
 * (app-screens.js), and the officers' (officer-screens.js).
 */
const createAppTree = async (node, parent, order, indent = "") => {
    const category = await createCategory({
        title: node.title,
        description: node.description,
        parent,
        isScreen: Boolean(node.questions),
        order,
    });
    if (!node.questions) {
        console.log(`${indent}${node.title.en}`);
        for (const [index, child] of node.children.entries()) {
            await createAppTree(child, category, index + 1, `${indent}  `);
        }
        return;
    }
    const before = stats.questions;
    for (const definition of inOrder(node.questions)) {
        await createQuestion(category._id, definition);
    }
    console.log(
        `${indent}${node.title.en.padEnd(34 - indent.length)} ${
            stats.questions - before
        } question(s)`
    );
};

/**
 * The field officers' questionnaire (officer-screens.js): a second tree in
 * the same two collections, added beside the villagers' and never in its
 * place. So it has a guard of its own and passes none of run()'s: those are
 * about the villagers' tree, and the wipe of --reset is of both collections
 * whole.
 *
 * ponytail: written one document at a time with no transaction, as the
 * villagers' tree is. A run cut off midway leaves part of the tree, live,
 * and the guard then refuses the next run: the officer categories and their
 * questions have to be taken out by hand. Put the loop in a transaction (a
 * publish has one) if that ever happens.
 */
const seedOfficerTree = async () => {
    const existing = await Categories.countDocuments(categoryFilter("officer"));
    if (existing > 0) {
        const why =
            `${existing} categor(ies) of the officer questionnaire already exist.\n` +
            "It has no --reset: change it in the dashboard.";
        if (!DRY_RUN) {
            console.error(`Refusing to seed: ${why}`);
            await mongoose.disconnect();
            process.exit(1);
        }
        console.log(`[dry run] a real run would refuse: ${why}\n`);
    }

    const officerTree = await buildOfficerTree(mongoose.connection.db, (warning) =>
        warnings.push(warning)
    );
    // The tree is whole before anything is written, so refusing costs
    // nothing; and it must: a picker written without options could not be
    // answered, and the guard above would refuse every run that came to put
    // it right.
    if (!DRY_RUN && warnings.length) {
        console.error(
            `Refusing to seed: ${warnings.length} thing(s) are missing.`
        );
        warnings.forEach((warning) => console.error(`  ! ${warning}`));
        console.error(
            "\nAn empty picker means the *_officer_dropdowns collection has no rows of\n" +
                "that type in this database. Copy the collection first\n" +
                "(scripts/copy-master-data.js; it skips a collection that already has\n" +
                "rows) or add rows of that type in the dashboard (Moderator Dropdowns),\n" +
                "then run this again."
        );
        await mongoose.disconnect();
        process.exit(1);
    }
    for (const [index, node] of officerTree.entries()) {
        await createAppTree(node, null, index + 1);
    }

    console.log(
        `\n${DRY_RUN ? "[dry run] would create" : "created"}: ` +
            `${stats.categories} officer categories, ${stats.questions} questions, ` +
            `${stats.options} options`
    );
    if (warnings.length) {
        console.log(`\n${warnings.length} thing(s) to review:`);
        warnings.forEach((warning) => console.log(`  ! ${warning}`));
        console.log(
            "\nAn empty picker means the *_officer_dropdowns collection has no rows of\n" +
                "that type in this database (scripts/copy-master-data.js copies them).\n" +
                "A real run refuses until every list has rows."
        );
    }
    console.log(
        "\nOption labels are the lists' own names, and the questions' Malay is the\n" +
            "app's, which looks machine translated. Review both in the dashboard."
    );
};

const run = async () => {
    await mongoose.connect(connection_url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        family: 4,
    });

    if (OFFICER) {
        await seedOfficerTree();
        await mongoose.disconnect();
        return;
    }

    // The villagers' tree only: the officers' is seeded on its own, and is
    // no reason to refuse this one.
    const existing = await Categories.countDocuments(categoryFilter("villager"));
    if (existing > 0 && !RESET && !DRY_RUN) {
        console.error(
            `Refusing to seed: ${existing} categor(ies) already exist.\n` +
                "Re-run with --reset to wipe and recreate, or --dry-run to preview."
        );
        await mongoose.disconnect();
        process.exit(1);
    }

    if (RESET && !DRY_RUN) {
        // The villagers' answers and the officers': the wipe below clears
        // every question, so an answer in either store would be orphaned.
        const responseCount = await countAnswers({});
        if (responseCount > 0) {
            console.error(
                `Refusing to reset: ${responseCount} response(s) exist, villagers' and officers' together.\n` +
                    "Deleting an answered question would orphan the answers bound to its questionId."
            );
            await mongoose.disconnect();
            process.exit(1);
        }

        // That wipe is of both collections whole, and this path rebuilds
        // the villagers' tree only.
        const officerCategories = await Categories.countDocuments(
            categoryFilter("officer")
        );
        if (officerCategories > 0) {
            console.error(
                `Refusing to reset: ${officerCategories} categor(ies) of the officer questionnaire exist.\n` +
                    "A reset clears every category and question, the officers' with the villagers'."
            );
            await mongoose.disconnect();
            process.exit(1);
        }

        // Work that exists nowhere else and cannot be rebuilt from the
        // schemas: what was published and by whom, drafts and questions
        // still waiting to be published, and anything a place added.
        const edited = {
            $or: [
                { hasDraft: true },
                { unpublished: true },
                { ownerPlaceId: { $ne: null } },
            ],
        };
        // …and what places changed about the Master's questions: every
        // override points at a question or category this would delete.
        const [historyCount, editedQuestions, editedCategories, overrideCount] =
            await Promise.all([
                History.countDocuments(),
                Questions.countDocuments(edited),
                Categories.countDocuments(edited),
                PlaceOverrides.countDocuments(),
            ]);
        if (
            historyCount + editedQuestions + editedCategories + overrideCount >
            0
        ) {
            console.error(
                `Refusing to reset: ${historyCount} published change(s) in the history, ` +
                    `${editedQuestions} question(s) and ${editedCategories} categor(ies) ` +
                    "with a draft, unpublished, or owned by a place, " +
                    `and ${overrideCount} change(s) places made for themselves.\n` +
                    "The questionnaire has been edited in the dashboard; a reset would discard that work."
            );
            await mongoose.disconnect();
            process.exit(1);
        }

        await Promise.all([Categories.deleteMany({}), Questions.deleteMany({})]);
        console.log("reset: cleared categories and questions\n");
    }

    const appTree = await buildAppTree(mongoose.connection.db, (warning) =>
        warnings.push(warning)
    );
    for (const [index, node] of appTree.entries()) {
        await createAppTree(node, null, index + 1);
    }

    for (const [sectionIndex, section] of TREE.entries()) {
        const sectionNode = await createCategory({
            title: section.title,
            parent: null,
            isScreen: false,
            order: appTree.length + sectionIndex + 1,
        });
        console.log(`${section.title}`);

        for (const [childIndex, child] of section.children.entries()) {
            const split = child.split ? SCREEN_SPLITS[child.split] : null;

            if (!split) {
                const screen = await createCategory({
                    title: child.title,
                    parent: sectionNode,
                    isScreen: true,
                    order: childIndex + 1,
                });
                const questions = await buildQuestions(child.model);
                for (const definition of questions) {
                    await createQuestion(screen._id, definition);
                }
                const groups = questions.filter(
                    (q) => q.type === "repeatable_group"
                ).length;
                console.log(
                    `  ${child.title.padEnd(30)} ${questions.length} question(s)` +
                        (groups ? `, ${groups} repeatable group(s)` : "")
                );
                continue;
            }

            // A discriminator collection becomes a sub-section of screens.
            const subSection = await createCategory({
                title: child.title,
                parent: sectionNode,
                isScreen: false,
                order: childIndex + 1,
            });
            console.log(`  ${child.title}`);

            for (const [screenIndex, screenSpec] of split.entries()) {
                const screen = await createCategory({
                    title: screenSpec.title,
                    parent: subSection,
                    isScreen: true,
                    order: screenIndex + 1,
                });
                const questions = await buildQuestions(child.model, [
                    ...(screenSpec.excludes || []),
                    "type",
                ]);
                for (const definition of questions) {
                    await createQuestion(screen._id, definition);
                }
                console.log(
                    `    ${screenSpec.title.padEnd(28)} ${questions.length} question(s)`
                );
            }
        }
    }

    console.log(
        `\n${DRY_RUN ? "[dry run] would create" : "created"}: ` +
            `${stats.categories} categories, ${stats.questions} questions, ` +
            `${stats.options} options`
    );
    if (appTranslations) {
        console.log(
            `  ${stats.translated} label(s) matched the app's i18next bundles ` +
                `(${appTranslations.languages.join(", ")})`
        );
    } else {
        console.log(
            "  app i18next bundles not found — labels are English-only"
        );
    }

    if (warnings.length) {
        console.log(`\n${warnings.length} thing(s) to review:`);
        warnings.forEach((warning) => console.log(`  ! ${warning}`));
        console.log(
            "\nEmpty option lists usually mean the matching *-dropdown collection\n" +
                "has no rows yet — seed those first, then re-run with --reset."
        );
    }

    console.log(
        "\nLabels not matched above are humanised field names, English only.\n" +
            "NOTE: the *-dropdown collections are NOT a translation source — their\n" +
            "controllers backfill ms/dz from en, so ~100% of those values are\n" +
            "English copies. Review wording in the dashboard before going live."
    );

    await mongoose.disconnect();
};

run().catch(async (err) => {
    console.error(err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
