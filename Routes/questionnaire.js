const router = require("express").Router();
const questionnaire_controller = require("../Controllers/questionnaire");
const { verifyAdmin, requireRole } = require("../Middlewares/admin");
const ControllerWrapper = require("../utils/ControllerWrapper");

/**
 * @swagger
 * /questionnaire/editor:
 *    get:
 *      tags:
 *        - Questionnaire
 *      summary: Everything the editor draws - for the Master, or for one place - drafts applied.
 *      description: >
 *        Returns scope, version, reach, every category and question with its
 *        draft applied (plus unpublished, hasDraft, rev, pendingArchive,
 *        pendingDelete, and for questions answered and replacedByPending),
 *        and pending - one entry per row of the Publish dialog, each with the
 *        items to send back to publish or discard it. For the Master each
 *        question also carries usage - the places that hide it, reword it or
 *        change its options, and how far its wording still reaches.
 *        With a place id as scope it is that place's questionnaire - what its
 *        chain of places is asked, each category and question with asked and
 *        status (master, hidden, added, changed, options - and the place that
 *        made it so), each question with inherited (the wording without this
 *        place's own change), options with their state there, own (this
 *        place's override) and lockedSwitch; plus compare (counts of what
 *        this place and the places above it changed), places (names of every
 *        place mentioned) and pending for the place and the places inside it.
 *        A regional account may open its own place and what is inside it.
 *        With audience=officer and scope=master it is the field officers'
 *        questionnaire - the same payload as the Master's, of that tree (no
 *        place changes it, so every usage is empty). It has no place scope.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: scope
 *         in: query
 *         description: The word master, or the id of a place.
 *         required: true
 *         schema:
 *           type: string
 *       - name: audience
 *         in: query
 *         description: villager (the default) or officer - whose questionnaire. officer goes with scope=master only, and is a super admin's.
 *         required: false
 *         schema:
 *           type: string
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        400:
 *          description: Unknown scope or audience, or a place scope asked of the officer questionnaire
 *        403:
 *          description: This place is not yours, or the Master asked for by a regional account
 *        404:
 *          description: Place not found
 *        500:
 *          description: Internal Server Error
 */
router.get(
    "/editor",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(questionnaire_controller.get_editor)
);

/**
 * @swagger
 * /questionnaire/overrides:
 *    put:
 *      tags:
 *        - Questionnaire
 *      summary: What a place sets about a question or category - as a draft.
 *      description: >
 *        items are {placeId, targetType, targetId, rev, patch}; one call may
 *        carry many (a bulk hide). Each patch is merged into what that place
 *        has set so far - a key with a value sets it, a key with null takes
 *        it back. asked is a boolean; label and helper_text are localised
 *        objects (label needs en); options is the whole list of {value,
 *        asked}; addedOptions is the whole list of {value, label, archived},
 *        where an entry without value is given a key by the server.
 *        Whatever changes nothing - a value equal to what the place inherits
 *        - is dropped, and a place left with nothing set has no override.
 *        A category, and a question the place added itself, take asked only.
 *        The target must be visible to that place. Returns items - {placeId,
 *        targetId, rev} each (rev 0 when no override is left). Nothing of
 *        the field officers' questionnaire can be a target (409) - places do
 *        not change it.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: body
 *         in: body
 *         description:
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             items:
 *               type: array
 *
 *      responses:
 *        200:
 *          description: Returns { items }.
 *        400:
 *          description: Bad request
 *        403:
 *          description: This place is not yours
 *        404:
 *          description: Place, question or category not found
 *        409:
 *          description: Changed by someone else, archived in the Master, the field that names each entry of a list, or a question or category of the officer questionnaire
 *        500:
 *          description: Internal Server Error
 */
router.put(
    "/overrides",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(questionnaire_controller.put_overrides)
);

/**
 * @swagger
 * /questionnaire/usage:
 *    get:
 *      tags:
 *        - Questionnaire
 *      summary: How much a question or a page is used.
 *      description: >
 *        For a question - answerCount (responses that answer it) and
 *        usedOptions (option keys those answers hold). For a category -
 *        answerCount (responses saved for that page). A regional account may
 *        ask about the Master's and about what the places above, at and
 *        inside its own have added.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: questionId
 *         in: query
 *         description: Required unless categoryId is given.
 *         required: false
 *         schema:
 *           type: string
 *       - name: categoryId
 *         in: query
 *         description:
 *         required: false
 *         schema:
 *           type: string
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.get(
    "/usage",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(questionnaire_controller.get_usage)
);

/**
 * @swagger
 * /questionnaire/publish:
 *    post:
 *      tags:
 *        - Questionnaire
 *      summary: Publish drafts - from here on the app asks what the editor shows.
 *      description: >
 *        One transaction. scope is "master" or a place id. items are the
 *        {type, id, rev} of the rows to publish, as GET /questionnaire/editor
 *        listed them - type is question, category or (a place only) override.
 *        A place's publish takes what that place and the places inside it
 *        own; anything else among the items refuses it (403). A rev that no
 *        longer matches stops the whole publish (409). A row that cannot go
 *        out - it waits on a row that was not sent, or answers were saved
 *        since - is skipped with its reason and the rest is published.
 *        Returns version, published (rows) and skipped ({type, id, reason}).
 *        audience says whose questionnaire the items are part of - villager
 *        (the default) or officer. An item of the other one stops the whole
 *        publish (409), and the officers' has scope master only. Both share
 *        the one version counter.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: body
 *         in: body
 *         description:
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             scope:
 *               type: string
 *             items:
 *               type: array
 *             audience:
 *               type: string
 *
 *      responses:
 *        200:
 *          description: Returns { version, published, skipped }.
 *        400:
 *          description: Bad request
 *        403:
 *          description: Not the caller's place, or an item that is not that place's
 *        409:
 *          description: Something sent was edited since the list was opened, or is part of the other questionnaire
 *        500:
 *          description: Internal Server Error
 */
router.post(
    "/publish",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(questionnaire_controller.publish)
);

/**
 * @swagger
 * /questionnaire/discard:
 *    post:
 *      tags:
 *        - Questionnaire
 *      summary: Throw drafts away.
 *      description: >
 *        items are {type, id, rev}; type is question, category or override.
 *        A published document goes back to what is published; one that was
 *        never published is deleted, with what was added inside it. An
 *        override goes back to what the place has published, or goes
 *        altogether. Each item is judged by the place it belongs to.
 *        audience says whose questionnaire the items are part of - villager
 *        (the default) or officer - and an item of the other one stops the
 *        discard (409). Returns discarded.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: body
 *         in: body
 *         description:
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             items:
 *               type: array
 *             audience:
 *               type: string
 *
 *      responses:
 *        200:
 *          description: Returns { discarded }.
 *        403:
 *          description: An item belongs to the Master or to a place that is not the caller's
 *        409:
 *          description: Changed by someone else, or an item is part of the other questionnaire
 *        500:
 *          description: Internal Server Error
 */
router.post(
    "/discard",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(questionnaire_controller.discard)
);

/**
 * @swagger
 * /questionnaire/history:
 *    get:
 *      tags:
 *        - Questionnaire
 *      summary: What was published, newest first.
 *      description: Returns rows (one per published change, with its summary), total, and actors - everyone who has published. A regional account gets the rows of its own place and of the places inside it, and the people who published there. One questionnaire at a time - the villagers', or with audience=officer the field officers' (a super admin's to read). rows, actors and latest are all of that one, so a publish in the other does not move latest.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: place
 *         in: query
 *         description: A place id - that place and everything inside it - or "master" for changes to the Master.
 *         required: false
 *         schema:
 *           type: string
 *       - name: audience
 *         in: query
 *         description: villager (the default) or officer - whose history.
 *         required: false
 *         schema:
 *           type: string
 *       - name: actor
 *         in: query
 *         description: The id of the account that published.
 *         required: false
 *         schema:
 *           type: string
 *       - name: from
 *         in: query
 *         description:
 *         required: false
 *         schema:
 *           type: string
 *       - name: to
 *         in: query
 *         description:
 *         required: false
 *         schema:
 *           type: string
 *       - name: page
 *         in: query
 *         description: Starts at 0.
 *         required: false
 *         schema:
 *           type: number
 *       - name: limit
 *         in: query
 *         description: 50 by default, capped at 200.
 *         required: false
 *         schema:
 *           type: number
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.get(
    "/history",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(questionnaire_controller.get_history)
);

/**
 * @swagger
 * /questionnaire/undo:
 *    post:
 *      tags:
 *        - Questionnaire
 *      summary: Takes back the latest published change.
 *      description: Only the newest row of the history the caller can see - for a regional account the newest of its own place and the places inside it. The row's earlier state is published again, as a new version with its own history row. Refused with 409 for a deletion, a replacement, a reorder, something that has a change waiting, or something new that already has answers. "Newest" is within one questionnaire - the villagers', or with audience officer the field officers' - so a publish in the other one since does not stand in the way.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - in: body
 *         name: Undo
 *         description:
 *         schema:
 *           type: object
 *           required:
 *             - id
 *           properties:
 *             id:
 *               type: string
 *               description: The id of the history row, as GET /questionnaire/history gives it in latest.
 *             audience:
 *               type: string
 *               description: villager (the default) or officer - the same as on the history call that gave the id.
 *
 *      responses:
 *        200:
 *          description: The new version, how many rows were published and what was skipped.
 *        400:
 *          description: Bad request
 *        403:
 *          description: Not this account's to undo
 *        409:
 *          description: Not the latest change, or it cannot be undone
 *        500:
 *          description: Internal Server Error
 */
router.post(
    "/undo",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(questionnaire_controller.undo)
);

module.exports = router;
