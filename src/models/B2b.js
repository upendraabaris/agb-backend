// src/models/B2b.js

import mongoose from "mongoose";
import User from "./User.js";

const b2bSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: User,
    },
    companyName: {
      type: String,
    },
    gstin: {
      type: String,
    },
    address: {
      type: String,
    },
    companyDescription: {
      type: String,
    },
    mobileNo: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
    },
  },
  { timestamps: true }
);

const B2b = mongoose.model("B2b", b2bSchema);

export default B2b;
