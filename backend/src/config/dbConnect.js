import mongoose from "mongoose";
import constants from "./constant.js";

const connectDB = async () => {
    if (!constants.MONGO_URI) {
        console.error("MongoDB connection failed: MONGO_URI is not set");
        process.exit(1);
    }

    try {
        await mongoose.connect(constants.MONGO_URI);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
};

export default connectDB;