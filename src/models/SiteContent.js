// src/models/SiteContent.js
import mongoose from "mongoose";

const siteContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
    },
    content: {
      type: String,
    },
  },
  { timestamps: true }
);

const SiteContent = mongoose.model("SiteContent", siteContentSchema);

export default SiteContent;
