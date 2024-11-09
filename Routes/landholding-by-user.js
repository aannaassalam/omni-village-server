const router = require("express").Router();
const landholding_by_user = require("../Controllers/landholding-by-user");
const { verifyToken, checkUser } = require("../Middlewares/user");

router.get(
    "/",
    verifyToken,
    checkUser,
    landholding_by_user.get_landholding_by_user
);

router.post(
    "/add-landholding-by-user",
    verifyToken,
    checkUser,
    landholding_by_user.add_landholding_by_user_data
);

module.exports = router;
