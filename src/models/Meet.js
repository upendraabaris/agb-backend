// src/models/Meet.js
import mongoose from "mongoose";

const meetSchema = new mongoose.Schema(
  {
    title: {
      type: String,
    },
    image:{
        type:String,
    },
    role: {
      type: String,
    },
  },
  { timestamps: true }
);

const Meet = mongoose.model("Meet", meetSchema);

export default Meet;
