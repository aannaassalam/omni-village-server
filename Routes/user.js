const router = require("express").Router();
const user_controller = require("../Controllers/user");
const { verifyToken } = require("../Middlewares/user");

router.post("/register", user_controller.register);
router.post("/send_otp", user_controller.send_otp);
router.get("/current_user", user_controller.get_current_user);
router.post("/login", user_controller.login);
router.post("/edit_user", verifyToken, user_controller.edit_user);
router.post("/forgot_password", user_controller.forgot_password);
router.post("/confirm_otp", user_controller.confirm_otp);
// router.post("/change_password", user_controller.change_password);
router.delete("/delete_user", verifyToken, user_controller.delete_user);

module.exports = router;
