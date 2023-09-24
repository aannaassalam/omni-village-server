const webhook = require("../Models/webhook");

const router = require("express").Router();

router.post("/", async (req, res) => {
  try {
    await webhook.create({
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
