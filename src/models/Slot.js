import mongoose from "mongoose";
const Schema = mongoose.Schema;

const slotSchema = new Schema({
  ad_slot: {
    type: String,
    required: true
  },
  ad_type: {
    type: String,
    enum: ["banner", "stamp"],
    required: true
  },
  position: {
    type: String,
    required: true
  },
  slot_number: {
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

const Slot = mongoose.model("Slot", slotSchema);
export default Slot;
