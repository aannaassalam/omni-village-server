const router = require("express").Router();
const multer = require("multer");
const moderator_controller = require("../Controllers/moderator");
const { checkModerator, verifyModeratorToken } = require("../Middlewares/user");
const fs = require("fs");
const ControllerWrapper = require("../utils/ControllerWrapper");
const { verifyAdmin, requireRole } = require("../Middlewares/admin");

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

// The dashboard's Moderators and Assign pages, and a super admin's. These
// two and /change-status below had no guard at all: anyone could read every
// officer's phone number and address, or approve an officer. And the
// officers' questionnaire rests on that approval (Controllers/officer.js).
router.get(
    "/list-all",
    verifyAdmin,
    requireRole("admin"),
    ControllerWrapper(moderator_controller.list_all)
);
router.get(
    "/list-all-approved",
    verifyAdmin,
    requireRole("admin"),
    ControllerWrapper(moderator_controller.list_all_approved)
);
// As /user/generate_token: an officer's token for a phone number, with no
// OTP. A super admin's only; neither client calls it.
router.post(
    "/generate_token",
    verifyAdmin,
    requireRole("admin"),
    moderator_controller.generate_token
);
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
    verifyAdmin,
    requireRole("admin"),
    ControllerWrapper(moderator_controller.change_moderator_status)
);

router.delete(
    "/delete_moderator",
    verifyModeratorToken,
    moderator_controller.delete_user
);

module.exports = router;
