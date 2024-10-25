const AppError = require("../AppError.js");

const ErrorHandler = (error, req, res, next) => {
    console.log(JSON.stringify(error, null, 2), error);
    if (error.name === "ValidationError") {
        return res.status(400).json({
            name: "ValidationError",
            message: Array.isArray(error.details)
                ? error.details[0].message
                : error.errors[Object.keys(error.errors)[0]].message,
        });
    }

    if (error instanceof AppError) {
        console.log(error);
        return res.status(error.statusCode).json({
            name: error.name,
            message: error.message,
        });
    }

    if (error.code === 11000) {
        return res.status(400).json({
            name: "Duplicate",
            message: "Email already exists",
        });
    }
    return res.status(500).send("Internal Server Error");
};
module.exports = ErrorHandler;
