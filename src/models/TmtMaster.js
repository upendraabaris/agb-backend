// src/models/TMTSeriesProcdut.js
import mongoose from "mongoose";
import Seller from "./Seller.js";
import Category from "./Category.js";

const VariantSchema = new mongoose.Schema({
  variantName: {
    type: String,
  },
  moq: {
    type: Number,
  },
  hsn: String,
});

const TMTMasterSchema = new mongoose.Schema(
  {
    categories: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: Category,
    },
    tmtseriesvariant: [VariantSchema],
    seriesType: {
      type: String,
      enum: ["normal", "tmt"],
    },
    listingCommType: {
      type: String,
      enum: ["fix", "percentage"],
    },
    listingComm: {
      type: Number,
    },
    productCommType: {
      type: String,
      enum: ["fix", "percentage"],
    },
    productComm: {
      type: Number,
    },
    shippingCommType: {
      type: String,
      enum: ["fix", "percentage"],
    },
    shippingComm: {
      type: Number,
    },
    fixedCommType: {
      type: String,
      enum: ["fix", "percentage"],
    },
    fixedComm: {
      type: Number,
    },
    brandCompareCategory: {
      type: String,
      unique: true,
    },
    section:{
      type:Boolean,
    },
  },
  { timestamps: true }
);

const TMTMaster = mongoose.model("TMTMaster", TMTMasterSchema);
export default TMTMaster;
