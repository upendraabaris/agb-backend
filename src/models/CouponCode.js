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
    couponType: {
      type: String,
      enum: ['product', 'ad'],
      default: 'product',
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      default: 'percentage',
    },
    maxUses: {
      type: Number,
      default: null,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    perUserLimit: {
      type: Number,
      default: 1,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const CouponCode = mongoose.model("CouponCode", coupaonCodeSchema);

export default CouponCode;
