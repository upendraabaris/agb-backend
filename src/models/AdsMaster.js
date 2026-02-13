import mongoose from "mongoose";
import Seller from "./Seller.js";
import AdCategory from "./AdCategory.js";
import Slot from "./Slot.js";

const adsMasterSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: Seller,
      required: true,
    },
    ad_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: AdCategory,
      required: true,
    },
    slot_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: Slot,
    },
    mobile_image_url: String,
    mobile_redirect_url: String,
    desktop_image_url: String,
    desktop_redirect_url: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const AdsMaster = mongoose.model("AdsMaster", adsMasterSchema);
export default AdsMaster;
