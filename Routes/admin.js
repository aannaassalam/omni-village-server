const router = require("express").Router();
const admin_controller = require("../Controllers/admin");

router.post("/register", admin_controller.register);
router.post("/login", admin_controller.login);
router.post("/forgot-password", admin_controller.forgot_password);
router.post("/change-password", admin_controller.change_password);

module.exports = router;
