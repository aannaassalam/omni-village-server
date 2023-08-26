const router = require("express").Router();
const crop_controller = require("../Controllers/crop");
const { verifyToken } = require("../Middlewares/user");

router.post("/", crop_controller.get_crop);
router.post("/crop_categories", crop_controller.get_crop_categoies);
router.post("/add_crop", verifyToken, crop_controller.add_crop);
router.post("/edit_crop", verifyToken, crop_controller.edit_crop);
router.delete("/", crop_controller.delete_crop);

module.exports = router;
