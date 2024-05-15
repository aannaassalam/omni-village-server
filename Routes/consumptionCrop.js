const router = require("express").Router();
const multer = require("multer");
const consumption_crop_controller = require("../Controllers/consumptionCrop");
const { verifyToken } = require("../Middlewares/user");

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
  "/dashboard",
  consumption_crop_controller.get_consumption_crop_dashboard
);

/**
 * @swagger
 * /consumption_crop/{consumption_type_id}:
 *    get:
 *      tags:
 *        - Consumption Crops
 *      summary: Get consumption crops.
 *      description: Get all consumption crops.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: consumption_type_id
 *         in: path
 *         description:
 *         required: true
 *         schema:
 *           type: string
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.get(
  "/:consumption_type_id",
  consumption_crop_controller.get_consumption_crop
);

router.get("/get_all", consumption_crop_controller.get_all);

router.post(
  "/add_crop",
  // verifyToken,
  consumption_crop_controller.add_crop
);
router.post(
  "/bulk-upload",
  upload.single("sheet"),
  // verifyToken,
  consumption_crop_controller.bulk_upload
);
router.post(
  "/edit_crop",
  // verifyToken,
  consumption_crop_controller.edit_crop
);
router.delete("/:id", consumption_crop_controller.delete_crop);

module.exports = router;
