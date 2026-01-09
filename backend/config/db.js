import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

export const connnectDB = async () => {
    try {
        const DBConnection = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log("Host : ", DBConnection.connections[0].host);
    } catch (err) {
        console.log("Error connecting to DB", err.message);
        process.exit(1)
    }
}