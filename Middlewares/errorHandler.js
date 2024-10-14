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

    if (err.message === "incorrect password") {
        return res.status(400).json({
            // name: "Duplicate",
            message: "The Password is incorrect",
        });
    }

    if (err.message === "invalid phone") {
        return res.status(400).json({
            message: "Please enter a valid mobile number!",
        });
    }

    if (err.code === 11000) {
        if (Object.keys(err.keyPattern)[0] === "phone") {
            return res.status(400).json({
                message: "Phone number already in use!",
            });
        }
        if (Object.keys(err.keyPattern)[0] === "username") {
            return res.status(400).json({
                message: "Username already in use!",
            });
        }
    }
    return res.status(500).send("Internal Server Error");
};
module.exports = ErrorHandler;
