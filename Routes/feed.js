const router = require("express").Router();
const feed_controller = require("../Controllers/feed");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get("/", ControllerWrapper(feed_controller.get_feed));
router.post("/add-feed", ControllerWrapper(feed_controller.add_feed));
router.put("/edit-feed", ControllerWrapper(feed_controller.edit_feed));
router.delete(
    "/delete-feed/:feed_id",
    ControllerWrapper(feed_controller.delete_feed)
);

module.exports = router;
