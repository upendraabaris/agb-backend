// src/models/HomePageSlider.js
import mongoose from "mongoose";

const homePageSliderSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
    },
    images: {
      type: [String],
    },
    content: {
      type: String,
    },
    url:{
      type:String,
    }
  },
  { timestamps: true }
);

const HomePageSlider = mongoose.model("HomePageSlider", homePageSliderSchema);

export default HomePageSlider;
