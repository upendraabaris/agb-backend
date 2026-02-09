// src/models/Ad_hoc.js
import mongoose from "mongoose";
import User from "./User.js";

const ad_hocSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: User,
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    price: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Ad_hoc = mongoose.model("Ad_hoc", ad_hocSchema);

export default Ad_hoc;
