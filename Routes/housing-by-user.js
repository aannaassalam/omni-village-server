const router = require("express").Router();
const housing_by_user = require("../Controllers/housing-by-user");
const { verifyToken, checkUser } = require("../Middlewares/user");

router.get("/", verifyToken, checkUser, housing_by_user.get_housing_by_user);
router.get(
    "/housing-requirements",
    verifyToken,
    checkUser,
    housing_by_user.get_housing_requirements
);

router.post(
    "/add-housing-by-user",
    verifyToken,
    checkUser,
    housing_by_user.add_housing_by_user_data
);

router.put(
    "/edit-housing-requirements",
    verifyToken,
    checkUser,
    housing_by_user.edit_housing_requirements
);

module.exports = router;
