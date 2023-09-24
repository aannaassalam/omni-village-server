const webhook = require("../Models/webhook");

const router = require("express").Router();

router.post("/", (req, res) => {
  try {
    webhook.create({
      data: req.body,
    });
    res.send("recieved");
  } catch (err) {
    res.status(400).json({
      msg: "Invalid Request",
      err,
    });
  }
});

module.exports = router;
