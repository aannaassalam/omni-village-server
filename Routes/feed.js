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
router.get("/get-all", feed_controller.get_all_feed);
router.get("/add-feed", feed_controller.add_feed);
router.get("/edit-feed", feed_controller.edit_feed);
router.get("/delete-feed/:feed_id", feed_controller.delete_feed);

module.exports = router;
