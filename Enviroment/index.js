module.exports =
    process.env.NODE_ENV === "production"
        ? process.env.MONGO_URL
        : "mongodb://localhost:27017/omnivillage";
