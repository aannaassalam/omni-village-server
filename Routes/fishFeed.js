const router = require("express").Router();
const fish_feed_controller = require("../Controllers/fishFeed");

/**
 * @swagger
 * /fish_feeds/:
 *    get:
 *      tags:
 *        - Fish Feeds
 *      summary: Get fish feeds.
 *      description: Get all fish feeds.
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
router.get("/", fish_feed_controller.get_fish_feed);

module.exports = router;
