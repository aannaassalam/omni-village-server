const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const swaggerJSDoc = require("swagger-jsdoc");
require("dotenv").config();
const swaggerUi = require("swagger-ui-express");
const csvtojson = require("csvtojson");
const path = require("path");
const ErrorHandler = require("./Middlewares/errorHandler");
const cookieParser = require("cookie-parser");

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
const consumptionCrop = require("./Routes/consumptionCrop");
const consumption = require("./Routes/consumption");
const webhook = require("./Routes/webhook");
const dashboard = require("./Routes/dashboard");
const admin = require("./Routes/admin");
const demographic = require("./Routes/demographicRoutes");
const Crop = require("./Models/poultryCrop");

const connection_url = require("./Enviroment");

const app = express();

const PORT = process.env.PORT || 5100;

const corsOption = {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
};

app.use(cors(corsOption));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

// app.use("/api/admin", admin);
app.use("/api/user", user);
app.use("/api/cultivation", cultivation);
app.use("/api/crop", crop);
// app.use("/api/trees", trees);
// app.use("/api/tree_crop", tree_crop);
// app.use("/api/poultry", poultry);
// app.use("/api/poultry_crop", poultry_crop);
// app.use("/api/hunting_crop", hunting_crop);
// app.use("/api/hunting", hunting);
// app.use("/api/storage_method", storage_method);
// app.use("/api/storage", storage);
// app.use("/api/selling_channel_method", selling_channel_method);
// app.use("/api/selling_channel", selling_channel);
// app.use("/api/fishery", fishery);
// app.use("/api/fishery_crop", fishery_crop);
app.use("/api/villages", villages);
// app.use("/api/land_measurements", land_measurement);
// app.use("/api/weight_measurements", weight_measurement);
// app.use("/api/fish_feeds", fish_feed);
// app.use("/api/feeds", feed);
// app.use("/api/consumption_type", consumptionType);
// app.use("/api/consumption_crop", consumptionCrop);
// app.use("/api/consumption", consumption);
// app.use("/api/demographic", demographic);
// app.use("/api/webhook", webhook);
// app.use("/api/dashboard", dashboard);

app.get("/", async (req, res) => {
    // const ress = await Crop.updateMany(
    //   {},
    //   { $set: { ideal_consumption_per_person: 20 } }
    // );
    // console.log(ress);
    res.send("Welcome to OmniVillage Server!");
});

app.use(ErrorHandler);

mongoose
    .connect(connection_url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        family: 4,
        dbName: "v2",
    })
    .then(() => {
        app.listen(PORT, () => {
            console.log("listening to port ", PORT);
            // upload();
        });
    })
    .catch((err) => console.log(err));
