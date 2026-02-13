import mongoose from "mongoose";
const Schema = mongoose.Schema;

const adTierMasterSchema = new Schema({
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

const AdTierMaster = mongoose.model("AdTierMaster", adTierMasterSchema);
export default AdTierMaster;
