const router = require("express").Router();
const demographic_dropdown = require("../Controllers/demographic-dropdown");
const multer = require("multer");
const fs = require("fs");
const ControllerWrapper = require("../utils/ControllerWrapper");

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

router.get(
    "/",
    ControllerWrapper(demographic_dropdown.get_demographic_dropdowns)
);
router.get("/get-all", demographic_dropdown.get_all);
router.post(
    "/add_demographic_dropdown",
    // verifyToken,
    ControllerWrapper(demographic_dropdown.add_demographic_data)
);
// router.post(
//     "/bulk-upload",
//     upload.single("sheet"),
//     // verifyToken,
//     crop_controller.bulk_upload
// );
router.put(
    "/edit_demographic_dropdown",
    // verifyToken,
    ControllerWrapper(demographic_dropdown.edit_demographic_data)
);
router.delete(
    "/delete_demographic_dropdown",
    ControllerWrapper(demographic_dropdown.delete_demographic_data)
);

module.exports = router;
