const { checkUser, verifyToken } = require("../Middlewares/user");
const hunting_controller = require("../Controllers/hunting");

const router = require("express").Router();

router.get("/", verifyToken, checkUser, hunting_controller.get_hunting);

router.post(
    "/add_hunting",
    verifyToken,
    checkUser,
    hunting_controller.add_hunting
);

router.post(
    "/edit_hunting",
    verifyToken,
    checkUser,
    hunting_controller.update_hunting
);

router.delete(
    "/delete_hunting/:id",
    // verifyToken,
    // checkUser,
    hunting_controller.delete_hunting
);

module.exports = router;
