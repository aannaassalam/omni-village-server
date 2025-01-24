const router = require("express").Router();
const { checkUser, verifyToken } = require("../Middlewares/user");
const mobility = require("../Controllers/mobility");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    verifyToken,
    checkUser,
    ControllerWrapper(mobility.get_mobility_by_user)
);

router.get(
    "/get-mobility",
    verifyToken,
    checkUser,
    ControllerWrapper(mobility.get_mobility_details)
);

router.post(
    "/add-mobility",
    verifyToken,
    checkUser,
    ControllerWrapper(mobility.add_mobility_details)
);

router.put(
    "/update-mobility",
    verifyToken,
    checkUser,
    ControllerWrapper(mobility.update_mobility_details)
);

router.delete(
    "/delete-mobility",
    verifyToken,
    checkUser,
    ControllerWrapper(mobility.delete_mobility)
);

module.exports = router;
