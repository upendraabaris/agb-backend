// src/models/CouponCode.js
import mongoose from "mongoose";

const coupaonCodeSchema = new mongoose.Schema(
  {
    couponName: {
      type: String,
      unique: true,
    },
    discount: {
      type: Number,
    },
    couponCode: {
      type: String,
      unique: true,
    },
    start: {
      type: String,
    },
    end: {
      type: String,
    },
    active: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

const CouponCode = mongoose.model("CouponCode", coupaonCodeSchema);

export default CouponCode;
