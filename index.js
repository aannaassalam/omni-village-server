const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const swaggerJSDoc = require("swagger-jsdoc");
require("dotenv").config();
const swaggerUi = require("swagger-ui-express");
const csvtojson = require("csvtojson");
const path = require("path");
const ErrorHandler = require("./Middlewares/errorHandler");

const user = require("./Routes/user");
const moderator = require("./Routes/moderator");
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
const demographic_dropdown = require("./Routes/demographic-dropdown");
const landholding_dropdown = require("./Routes/landholding-dropdown");
const landholding_by_user = require("./Routes/landholding-by-user");
const landholding = require("./Routes/landholding");
const housing_dropdown = require("./Routes/housing-dropdown");
const housing_by_user = require("./Routes/housing-by-user");
const housing = require("./Routes/housing");
const water_dropdown = require("./Routes/water-dropdown");
const water = require("./Routes/water");
const energy_dropdown = require("./Routes/energy-dropdown");
const energy = require("./Routes/energy");
const mobility_by_user = require("./Routes/mobility-by-user");
const mobility_dropdown = require("./Routes/mobility-dropdown");
const mobility = require("./Routes/mobility");
const forestry_dropdown = require("./Routes/forestry-dropdown");
const forestry = require("./Routes/forestry");
const other_personal_household_items_dropdown = require("./Routes/other-personal-household-items-dropdown");
const other_personal_household_items = require("./Routes/other-personal-household-items");
const business_dropdown = require("./Routes/business-dropdown");
const business_by_user = require("./Routes/business-by-user");
const business_commercial = require("./Routes/business-commercial");
const demographic_officer = require("./Routes/demographic-officer");
const energy_officer = require("./Routes/energy-officer");
const landholding_officer = require("./Routes/landholding-officer");
const mobility_officer = require("./Routes/mobility-officer");
const water_officer = require("./Routes/water-officer");

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
app.set("views", path.join(__dirname, "Views"));
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

app.use("/api/admin", admin);
app.use("/api/user", user);
app.use("/api/moderator", moderator);
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
app.use("/api/consumption_crop", consumptionCrop);
app.use("/api/consumption", consumption);
app.use("/api/demographic_dropdown", demographic_dropdown);
app.use("/api/demographic", demographic);
app.use("/api/landholding-dropdown", landholding_dropdown);
app.use("/api/landholding-by-user", landholding_by_user);
app.use("/api/landholding", landholding);
app.use("/api/housing-dropdown", housing_dropdown);
app.use("/api/housing-by-user", housing_by_user);
app.use("/api/housing", housing);
app.use("/api/water-dropdown", water_dropdown);
app.use("/api/water", water);
app.use("/api/energy-dropdown", energy_dropdown);
app.use("/api/energy", energy);
app.use("/api/mobility-dropdown", mobility_dropdown);
app.use("/api/mobility-by-user", mobility_by_user);
app.use("/api/mobility", mobility);
app.use("/api/forestry-dropdown", forestry_dropdown);
app.use("/api/forestry", forestry);
app.use(
    "/api/other-personal-household-items-dropdown",
    other_personal_household_items_dropdown
);
app.use("/api/other-personal-household-items", other_personal_household_items);
app.use("/api/business-dropdown", business_dropdown);
app.use("/api/business-by-user", business_by_user);
app.use("/api/business-commercial", business_commercial);
app.use("/api/demographic-officer", demographic_officer);
app.use("/api/energy-officer", energy_officer);
app.use("/api/landholding-officer", landholding_officer);
app.use("/api/mobility-officer", mobility_officer);
app.use("/api/water-officer", water_officer);
app.use("/api/webhook", webhook);
app.use("/api/dashboard", dashboard);

app.get("/", async (req, res) => {
    // for await (const _item of Object.entries(object_of_arrays)) {
    //     const [key, value] = _item;
    //     for await (const _value of value) {
    //         const res = await demographicDropdown.create({
    //             name: {
    //                 en: _value,
    //                 ms: _value,
    //                 dz: _value,
    //             },
    //             type: key,
    //         });
    //     }
    // }
    res.send("Welcome to OmniVillage Server!");
});

app.use(ErrorHandler);

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
