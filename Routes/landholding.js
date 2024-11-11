const router = require("express").Router();
const landholding = require("../Controllers/landholding");
const { verifyToken, checkUser } = require("../Middlewares/user");

router.get("/", verifyToken, checkUser, landholding.get_landholding);

router.put(
    "/update-landholding",
    verifyToken,
    checkUser,
    landholding.update_landholding
);

module.exports = router;
