const router = require("express").Router();
const multer = require("multer");
const user_controller = require("../Controllers/user");
const { verifyToken, checkUser } = require("../Middlewares/user");
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

/**
 * @swagger
 * /api/user/register:
 *    post:
 *      summary: Register a new user
 *      description: Register a new user after the otp has been sent to user.
 *      requestBody:
 *          description: Request body
 *          required: true
 *          content:
 *            application/x-www-form-urlencoded:
 *              schema:
 *                type: object
 *                required:
 *                   - phone
 *                   - country_code
 *                   - otp
 *                properties:
 *                  phone:
 *                    type: string
 *                  country_code:
 *                    type: string
 *                  otp:
 *                    type: string
 *                examples:
 *                  phone: 1234567890
 *      responses:
 *        200:
 *          description: Successfully registered a user.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.post("/register", user_controller.register);
router.post("/generate_token", user_controller.generate_token);
router.post("/send_otp", user_controller.send_otp);
router.get("/current_user", checkUser, user_controller.get_current_user);
router.post("/login", user_controller.login);
router.post(
  "/edit_user",
  upload.single("address_proof"),
  checkUser,
  user_controller.edit_user
);
router.post("/refresh", user_controller.refresh);
router.delete("/delete_user", verifyToken, user_controller.delete_user);
router.post(
  "/land_allocation",
  verifyToken,
  checkUser,
  user_controller.land_allocation
);
router.post(
  "/cultivation_land_allocation",
  verifyToken,
  checkUser,
  user_controller.cultivation_land_allocation
);
// router.post("/check_url", upload.single("img"), async (req, res) => {
//   console.log(req.body);
//   console.log(req.file);

//   res.send(`${req.headers.host}/${req.file.path}`);
// });
// router.post("/forgot_password", user_controller.forgot_password);
// router.post("/confirm_otp", user_controller.confirm_otp);
// router.post("/change_password", user_controller.change_password);

module.exports = router;
