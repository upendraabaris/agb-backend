import mongoose from "mongoose";
const Schema = mongoose.Schema;

const adCategorySchema = new Schema({
  categoryMasterId: {
    type: Schema.Types.ObjectId,
    ref: "AdCategoryMaster",
    required: true
  },
  ad_type: {
    type: String,
    enum: ["banner", "stamp"],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  priority: {
    type: Number,
    required: true
  },
  duration_days: {
    type: Number,
    required: true
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const AdCategory = mongoose.model("AdCategory", adCategorySchema);
export default AdCategory;
