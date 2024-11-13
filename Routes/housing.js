const router = require("express").Router();
const multer = require("multer");
const housing = require("../Controllers/housing");
const { verifyToken, checkUser } = require("../Middlewares/user");
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

router.get("/", verifyToken, checkUser, ControllerWrapper(housing.get_housing));

router.put(
    "/update-housing",
    verifyToken,
    checkUser,
    upload.fields([
        {
            name: "front_photo",
            maxCount: 1,
        },
        {
            name: "back_photo",
            maxCount: 1,
        },
        {
            name: "neighbourhood_photo",
            maxCount: 1,
        },
        {
            name: "inside_living_photo",
            maxCount: 1,
        },
        {
            name: "kitchen_photo",
            maxCount: 1,
        },
    ]),
    ControllerWrapper(housing.update_housing)
);

module.exports = router;
