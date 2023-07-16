const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const user = require("./Routes/user");

const connection_url = require("./Enviroment");

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*", optionsSuccessStatus: 200 }));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/api/user", user);

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
