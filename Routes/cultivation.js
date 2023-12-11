const { checkUser, verifyToken } = require("../Middlewares/user");
const cultivation_controller = require("../Controllers/cultivation");

const router = require("express").Router();

router.post(
  "/",
  verifyToken,
  checkUser,
  cultivation_controller.get_cultivation
);
router.get(
  "/get_all",
  // verifyToken,
  // checkUser,
  cultivation_controller.get_all_cultivations
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
router.delete(
  "/delete_cultivation/:id",
  // verifyToken,
  // checkUser,
  cultivation_controller.delete_cultivation
);
router.get("/list-all", cultivation_controller.cultivation_list);

module.exports = router;
