const router = require("express").Router();
const crop_controller = require("../Controllers/crop");
const { verifyToken } = require("../Middlewares/user");

router.get("/", crop_controller.get_crop);
router.get("/get_all", crop_controller.get_all);
router.post(
  "/add_crop",
  // verifyToken,
  crop_controller.add_crop
);
router.post(
  "/edit_crop",
  // verifyToken,
  crop_controller.edit_crop
);
router.delete("/:id", crop_controller.delete_crop);

module.exports = router;
