const router = require("express").Router();
const multer = require("multer");
const user_controller = require("../Controllers/user");
const { verifyToken, checkUser } = require("../Middlewares/user");
const fs = require("fs");
const sharp = require("sharp");
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

router.get("/list-all", ControllerWrapper(user_controller.list_all));

router.get("/download-pdf", ControllerWrapper(user_controller.download_pdf));

router.post("/register", ControllerWrapper(user_controller.register));

router.get(
    "/generate_token",
    ControllerWrapper(user_controller.generate_token)
);
router.post("/send_otp", ControllerWrapper(user_controller.send_otp));
router.get(
    "/current_user",
    checkUser,
    ControllerWrapper(user_controller.get_current_user)
);
router.post("/login", ControllerWrapper(user_controller.login));
router.put(
    "/edit_user",
    upload.fields([
        { name: "address_proof", maxCount: 1 },
        { name: "field_officer_document", maxCount: 1 },
    ]),
    checkUser,
    ControllerWrapper(user_controller.edit_user)
);
router.put(
    "/land_allocation",
    verifyToken,
    checkUser,
    user_controller.land_allocation
);

module.exports = router;
