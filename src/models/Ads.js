// src/models/HomePageSlider.js
import mongoose from "mongoose";

const adsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
    },
    images: {
      type: String,
    },
    url: {
      type: String,
    },
    active:{
      type:Boolean,
    }
  },
  { timestamps: true }
);

const Ads = mongoose.model("Ads", adsSchema);

export default Ads;
