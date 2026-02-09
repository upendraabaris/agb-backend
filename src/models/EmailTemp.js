// src/models/EmailTemp.js
import mongoose from "mongoose";
import User from "./User.js";

const emailTempSchema = new mongoose.Schema(
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
    html: {
      type: String,
      required: true,
    },
    design: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const EmailTemp = mongoose.model("EmailTemp", emailTempSchema);

export default EmailTemp;
