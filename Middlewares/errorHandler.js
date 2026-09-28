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

    // A malformed id (`?id=nope`) is the caller's mistake, not a server fault.
    // Mongoose raises CastError when casting a query/body value; the bson
    // driver raises BSONError from `new ObjectId(...)`. Both used to fall
    // through to 500.
    if (error.name === "CastError" || error.name === "BSONError") {
        return res.status(400).json({
            name: "InvalidValue",
            message: error.path
                ? `"${error.path}" has an invalid value`
                : "An id in the request is not valid",
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
