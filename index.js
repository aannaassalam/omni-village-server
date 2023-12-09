const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const swaggerJSDoc = require("swagger-jsdoc");
require("dotenv").config();
const swaggerUi = require("swagger-ui-express");
const csvtojson = require("csvtojson");

const user = require("./Routes/user");
const cultivation = require("./Routes/cultivation");
const crop = require("./Routes/crop");
const trees = require("./Routes/trees");
const tree_crop = require("./Routes/treeCrop");
const poultry = require("./Routes/poultry");
const poultry_crop = require("./Routes/poultryCrop");
const hunting = require("./Routes/hunting");
const hunting_crop = require("./Routes/huntingCrop");
const storage = require("./Routes/storage");
const storage_method = require("./Routes/storageMethod");
const selling_channel = require("./Routes/sellingChannel");
const selling_channel_method = require("./Routes/sellingChannelMethod");
const fishery_crop = require("./Routes/fisheryCrop");
const fishery = require("./Routes/fishery");
const villages = require("./Routes/villages");
const land_measurement = require("./Routes/landMeasurement");
const weight_measurement = require("./Routes/weightMeasurement");
const fish_feed = require("./Routes/fishFeed");
const feed = require("./Routes/feed");
const consumptionType = require("./Routes/consumptionType");
// const consumptionCrop = require("./Routes/consumptionCrop");
const consumption = require("./Routes/consumption");
const webhook = require("./Routes/webhook");
const Crop = require("./Models/treeCrop");

const connection_url = require("./Enviroment");

const app = express();

const PORT = process.env.PORT || 5100;

const swaggerDefinition = {
  swagger: "2.0",
  info: {
    title: "Omni Village API Documentation",
    version: "1.0.0",
    description:
      "This is a REST API Server made with Express. It serves data for Omni Village.",
    contact: {
      name: "Anas Alam",
      url: "https://www.linkedin.com/in/anas-alam-0207331b2/",
    },
  },
  basePath: "/api",
  securityDefinitions: {
    bearerAuth: {
      type: "apiKey",
      name: "Authorization",
      scheme: "bearer",
      in: "header",
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: ["./Routes/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

app.set("view engine", "ejs");

app.use(cors({ origin: "*", optionsSuccessStatus: 200 }));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use(
  "/api/documentation",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      docExpansion: "none",
    },
  })
);

app.use("/api/user", user);
app.use("/api/cultivation", cultivation);
app.use("/api/crop", crop);
app.use("/api/trees", trees);
app.use("/api/tree_crop", tree_crop);
app.use("/api/poultry", poultry);
app.use("/api/poultry_crop", poultry_crop);
app.use("/api/hunting_crop", hunting_crop);
app.use("/api/hunting", hunting);
app.use("/api/storage_method", storage_method);
app.use("/api/storage", storage);
app.use("/api/selling_channel_method", selling_channel_method);
app.use("/api/selling_channel", selling_channel);
app.use("/api/fishery", fishery);
app.use("/api/fishery_crop", fishery_crop);
app.use("/api/villages", villages);
app.use("/api/land_measurements", land_measurement);
app.use("/api/weight_measurements", weight_measurement);
app.use("/api/fish_feeds", fish_feed);
app.use("/api/feeds", feed);
app.use("/api/consumption_type", consumptionType);
// app.use("/api/consumption_crop", consumptionCrop);
app.use("/api/consumption", consumption);
app.use("/api/webhook", webhook);

app.get("/", async (req, res) => {
  res.send("Welcome to OmniVillage Server!");
});

// app.use((err, req, res, next) => {
//   console.log(err);
//   res.status(500).send("Internal Server Error!");
//   Logger.error(
//     `${err.status || 500} - ${res.statusMessage} - ${err.message} - ${
//       req.originalUrl
//     } - ${req.method} - ${req.ip}`
//   );
// });

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
