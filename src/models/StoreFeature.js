// src/models/StoreFeature.js
import mongoose from "mongoose";

const StoreFeatureSchema = new mongoose.Schema(
  {
    storeName: { type: String, unique: true },
    key: { type: String },
    solt: { type: String },
    pincode: { type: Boolean },
    online: { type: Boolean },
    dmt: { type: Boolean },
    cod: { type: Boolean },
    associate: { type: Boolean },
    fixSeries: { type: Boolean },
    customSeries: { type: Boolean },
    storeBusinessName: { type: String },
    storeBusinessAddress: { type: String },
    storeBusinessCity: { type: String },
    storeBusinessState: { type: String },
    storeBusinessPanNo: { type: String },
    storeBusinessGstin: { type: String },
    storeBusinessCinNo: { type: String },
    comBillFormate: { type: String },
    sellerBillFormate: { type: String },
    ccKey: { type: String },
    ccSolt: { type: String },
    bgColor: { type: String },
    fontColor: { type: String },
    whatsappAPINo: { type: String },
    dtmHelpVideo: { type: String },
    sellerMasking: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const StoreFeature = mongoose.model("StoreFeature", StoreFeatureSchema);

export default StoreFeature;
