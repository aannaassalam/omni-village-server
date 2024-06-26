const router = require("express").Router();
const hunting_crop_controller = require("../Controllers/huntingCrop");
const { verifyToken } = require("../Middlewares/user");
const fs = require("fs");
const multer = require("multer");

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

router.post(
  "/bulk-upload",
  upload.single("sheet"),
  // verifyToken,
  hunting_crop_controller.bulk_upload
);

/**
 * @swagger
 * /hunting_crop/:
 *    get:
 *      tags:
 *        - Hunting Crops
 *      summary: Get hunting live stocks.
 *      description: Get all hunting live stocks.
 *      produces:
 *        - application/json
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.get("/", hunting_crop_controller.get_hunting_crop);

router.get("/get_all", hunting_crop_controller.get_all_hunting_crop);

/**
 * @swagger
 * /hunting_crop/add_hunting_crop:
 *    post:
 *      tags:
 *        - Hunting Crops
 *      summary: Add hunting crop.
 *      description: Add a hunting crop.
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
 *             name:
 *               type: string
 *               example: deer
 *
 *      responses:
 *        200:
 *          description: Successfully added data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.post(
  "/add_hunting_crop",
  // verifyToken,
  hunting_crop_controller.add_hunting_crop
);

/**
 * @swagger
 * /hunting_crop/edit_hunting_crop:
 *    post:
 *      tags:
 *        - Hunting Crops
 *      summary: Edit hunting crop.
 *      description: Edit a hunting crop.
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
 *             hunting_crop_id:
 *               type: string
 *               example: 64ee46ad2f3332cd78c7e7e2
 *             name:
 *               type: string
 *               example: deer
 *
 *      responses:
 *        200:
 *          description: Successfully updated data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.post(
  "/edit_hunting_crop",
  // verifyToken,
  hunting_crop_controller.edit_hunting_crop
);

/**
 * @swagger
 * /hunting_crop/{id}:
 *    delete:
 *      tags:
 *        - Hunting Crops
 *      summary: Delete hunting crop.
 *      description: Delete a hunting crop.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: id
 *         in: path
 *         description:
 *         required: true
 *         schema:
 *           type: string
 *
 *      responses:
 *        200:
 *          description: Successfully deleted data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.delete("/:id", hunting_crop_controller.delete_hunting_crop);

module.exports = router;
