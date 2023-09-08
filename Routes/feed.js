const router = require("express").Router();
const feed_controller = require("../Controllers/feed");

/**
 * @swagger
 * /feeds/:
 *    get:
 *      tags:
 *        - Feeds
 *      summary: Get feeds.
 *      description: Get all feeds.
 *      produces:
 *        - application/json
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.get("/", feed_controller.get_feed);

module.exports = router;
