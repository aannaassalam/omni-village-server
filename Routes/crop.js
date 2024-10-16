const router = require("express").Router();
const crop_controller = require("../Controllers/crop");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");
const multer = require("multer");
const fs = require("fs");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const ext = file.mimetype.split("/")[1];
        if (ext === "csv") {
            fs.mkdir("./csv", (err) => {
                cb(null, "./csv");
            });
        } else {
            cb("Only CSV formats are supported", null);
        }
    },
    filename: (req, file, cb) => {
        // console.log(file.mimetype.split("/")[1]);
        cb(null, `${Date.now()}.csv`);
    },
});

const upload = multer({ storage });

router.get("/", checkUser, ControllerWrapper(crop_controller.get_crops));
router.get("/get_all", crop_controller.get_all);
router.post(
    "/add_crop",
    // verifyToken,
    crop_controller.add_crop
);
router.post(
    "/bulk-upload",
    upload.single("sheet"),
    // verifyToken,
    crop_controller.bulk_upload
);
router.post(
    "/edit_crop",
    // verifyToken,
    crop_controller.edit_crop
);
router.delete("/:id", crop_controller.delete_crop);

module.exports = router;
