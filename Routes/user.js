const router = require("express").Router();
const multer = require("multer");
const user_controller = require("../Controllers/user");
const { verifyToken } = require("../Middlewares/user");
const fs = require("fs");
const sharp = require("sharp");

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
    console.log(file.mimetype.split("/")[1]);
    cb(null, `${Date.now()}.png`);
  },
});

const upload = multer({ storage });

router.post(
  "/register",
  upload.single("address_proof"),
  user_controller.register
);
router.post("/send_otp", user_controller.send_otp);
router.get("/current_user", user_controller.get_current_user);
router.post("/login", user_controller.login);
router.post(
  "/edit_user",
  verifyToken,
  upload.single("address_proof"),
  user_controller.edit_user
);
router.post("/refresh", user_controller.refresh);
// router.post("/check_url", upload.single("img"), async (req, res) => {
//   console.log(req.body);
//   console.log(req.file);

//   res.send(`${req.headers.host}/${req.file.path}`);
// });
// router.post("/forgot_password", user_controller.forgot_password);
// router.post("/confirm_otp", user_controller.confirm_otp);
// router.post("/change_password", user_controller.change_password);
router.delete("/delete_user", verifyToken, user_controller.delete_user);

module.exports = router;
