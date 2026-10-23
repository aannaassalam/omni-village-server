const router = require("express").Router();
const user_controller = require("../Controllers/user");
const { verifyToken, checkUser } = require("../Middlewares/user");
const { verifyAdmin, requireRole } = require("../Middlewares/admin");
const ControllerWrapper = require("../utils/ControllerWrapper");
const { oneFile } = require("../Middlewares/upload");

/**
 * @swagger
 * /user/list-all:
 *    get:
 *      tags:
 *        - User
 *      summary: Get All User
 *      description: Currently Pagination is not working.
 *      produces:
 *        - application/json
 *      parameters:
 *        - in: query
 *          name: limit
 *          schema:
 *            type: integer
 *
 *        - in: query
 *          name: page
 *          schema:
 *            type: integer
 *
 *      responses:
 *        200:
 *          description: Successfully fetched all users.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.get(
    "/list-all",
    verifyAdmin,
    requireRole("admin"),
    user_controller.list_all
);

router.get("/download-pdf", user_controller.download_pdf);

/**
 * @swagger
 * /user/register:
 *    post:
 *      tags:
 *        - User
 *      summary: Register a new user
 *      description: Register a new user after the otp has been sent to user.
 *      produces:
 *        - application/json
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

/**
 * @swagger
 * /user/generate_token:
 *    post:
 *      tags:
 *        - User
 *      summary: Generate token without login.
 *      description: Generate a bearer token without logging in.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: body
 *         in: body
 *         description:
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             phone:
 *               type: string
 *               example: 9086754532
 *             country_code:
 *               type: string
 *               example: "+91"
 *
 *      responses:
 *        200:
 *          description: Successfully generated token.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
// Hands out a villager's token for a phone number, with no OTP: a support
// tool, so a super admin's only. (Neither the app nor the dashboard calls it.)
router.post(
    "/generate_token",
    verifyAdmin,
    requireRole("admin"),
    user_controller.generate_token
);
router.post("/send_otp", user_controller.send_otp);
router.get("/current_user", checkUser, user_controller.get_current_user);
router.post("/login", user_controller.login);
router.post(
    "/edit_user",
    // A session that is no longer good is a 401 here, before anything else:
    // the handler used to fail on it without ever answering.
    verifyToken,
    checkUser,
    // The photo of the address proof, at registration. Into memory: this
    // host has no disk (Controllers/files.js keeps it). An edit sends no
    // file.
    oneFile("address_proof", { required: false }),
    ControllerWrapper(user_controller.edit_user)
);
router.post("/refresh", user_controller.refresh);
router.delete("/delete_user", verifyToken, user_controller.delete_user);
router.delete(
    "/delete_individual_user",
    verifyAdmin,
    requireRole("admin"),
    user_controller.delete_individual_user
);
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
