// src/db/mongodb.js
import mongoose from "mongoose";

mongoose.set("strictQuery", false);

const url = process.env.MONGO_DB_URL;

mongoose.connect(url);

const db = mongoose.connection;

db.once("open", () => {
  console.log("Connected To MongoDB");
});

db.on("error", (error) => {
  console.log(error);
});

export default mongoose;
