const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const swaggerJSDoc = require("swagger-jsdoc");
const country = require("countries-list");
const swaggerUi = require("swagger-ui-express");

const user = require("./Routes/user");
const cultivation = require("./Routes/cultivation");
const crop = require("./Routes/crop");
const trees = require("./Routes/trees");
const tree_crop = require("./Routes/treeCrop");

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

app.use(cors({ origin: "*", optionsSuccessStatus: 200 }));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/documentation", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/user", user);
app.use("/api/cultivation", cultivation);
app.use("/api/crop", crop);
app.use("/api/trees", trees);
app.use("/api/tree_crop", tree_crop);

app.get("/", (req, res) => {
  res.send("Welcome to OmniVillage Server!");
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
