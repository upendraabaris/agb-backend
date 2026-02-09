import mongoose from "mongoose";
const Schema = mongoose.Schema;

const adCategoryMasterSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const AdCategoryMaster = mongoose.model("AdCategoryMaster", adCategoryMasterSchema);
export default AdCategoryMaster;
