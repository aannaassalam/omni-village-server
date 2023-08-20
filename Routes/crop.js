const router = require("express").Router();
const crop_controller = require("../Controllers/crop");
const { verifyToken } = require("../Middlewares/user");

router.get("/", crop_controller.get_crop);
router.post("/", verifyToken, crop_controller.add_crop);
router.post("/edit_crop", verifyToken, crop_controller.edit_crop);
router.delete("/", crop_controller.delete_crop);

module.exports = router;
