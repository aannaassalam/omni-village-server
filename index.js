const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const country = require("countries-list");

const user = require("./Routes/user");
const cultivation = require("./Routes/cultivation");
const crop = require("./Routes/crop");

const connection_url = require("./Enviroment");

const app = express();

const PORT = process.env.PORT || 5100;

app.use(cors({ origin: "*", optionsSuccessStatus: 200 }));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/user", user);
app.use("/api/cultivation", cultivation);
app.use("/api/crop", crop);

app.get("/", (req, res) => {
  res.json(country.getUnicode(country.getEmojiFlag("MY")));
  // res.send("Welcome to Omni Village Server!!!")
});

mongoose
  .connect(connection_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    family: 4,
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log("listening to port ", PORT);
      // upload();
    });
  })
  .catch((err) => console.log(err));
