import mongoose from "mongoose";
import AdsMaster from "./AdsMaster.js";
import Slot from "./Slot.js";

const adCampaignSchema = new mongoose.Schema(
  {
    ad_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: AdsMaster,
      required: true,
    },
    slot_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: Slot,
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["running", "done"],
      default: "running",
    },
  },
  { timestamps: true }
);

const AdCampaign = mongoose.model("AdCampaign", adCampaignSchema);
export default AdCampaign;
