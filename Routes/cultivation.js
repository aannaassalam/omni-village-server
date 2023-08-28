const { checkUser, verifyToken } = require("../Middlewares/user");
const cultivation_controller = require("../Controllers/cultivation");

const router = require("express").Router();

router.post(
  "/",
  verifyToken,
  checkUser,
  cultivation_controller.get_cultivation
);
router.post(
  "/add_cultivation",
  verifyToken,
  checkUser,
  cultivation_controller.add_cultivation
);
router.post(
  "/edit_cultivation",
  verifyToken,
  checkUser,
  cultivation_controller.update_cultivation
);
router.post(
  "/delete_cultivation",
  verifyToken,
  checkUser,
  cultivation_controller.delete_cultivation
);

module.exports = router;
