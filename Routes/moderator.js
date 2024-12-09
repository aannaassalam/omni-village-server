const router = require("express").Router();
const multer = require("multer");
const moderator_controller = require("../Controllers/moderator");
const { checkModerator, verifyModeratorToken } = require("../Middlewares/user");
const fs = require("fs");
const ControllerWrapper = require("../utils/ControllerWrapper");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const ext = file.mimetype.split("/")[0];
        if (ext === "image") {
            fs.mkdir("./uploads", (err) => {
                cb(null, "./uploads");
            });
        } else {
            cb("Only image formats are supported", null);
        }
    },
    filename: (req, file, cb) => {
        // console.log(file.mimetype.split("/")[1]);
        cb(null, `${Date.now()}.png`);
    },
});

const upload = multer({ storage });

router.get("/list-all", ControllerWrapper(moderator_controller.list_all));
router.get(
    "/list-all-approved",
    ControllerWrapper(moderator_controller.list_all_approved)
);
router.post("/generate_token", moderator_controller.generate_token);
router.post("/register", moderator_controller.register);

router.post("/send_otp", moderator_controller.send_otp);
router.get(
    "/current_moderator",
    checkModerator,
    moderator_controller.get_current_user
);
router.post("/login", moderator_controller.login);
router.post(
    "/edit_moderator",
    upload.fields([
        { name: "address_proof", maxCount: 1 },
        { name: "officer_proof", maxCount: 1 },
    ]),
    checkModerator,
    moderator_controller.edit_user
);
router.put(
    "/change-status",
    ControllerWrapper(moderator_controller.change_moderator_status)
);

router.delete(
    "/delete_moderator",
    verifyModeratorToken,
    moderator_controller.delete_user
);

module.exports = router;
