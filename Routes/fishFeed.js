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
router.get("/get-all", fish_feed_controller.get_all_fish_feed);
router.get("/add-fish-feed", fish_feed_controller.add_fish_feed);
router.get("/edit-fish-feed", fish_feed_controller.edit_fish_feed);
router.get("/delete-fish-feed/:feed_id", fish_feed_controller.delete_fish_feed);

module.exports = router;
