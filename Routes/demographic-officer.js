const router = require("express").Router();
const multer = require("multer");
const demographic_controller = require("../Controllers/demographic-officer");
const { checkModerator, verifyModeratorToken } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");
const fs = require("fs");

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

router.get(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(demographic_controller.get_demographic_officer)
);
router.post(
    "/",
    verifyModeratorToken,
    checkModerator,
    upload.array("upload_house_picture"),
    ControllerWrapper(demographic_controller.add_demographic_officer)
);
router.put(
    "/",
    verifyModeratorToken,
    checkModerator,
    upload.array("upload_house_picture"),
    ControllerWrapper(demographic_controller.edit_demographic_officer)
);
router.delete(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(demographic_controller.delete_demographic_officer)
);

module.exports = router;
