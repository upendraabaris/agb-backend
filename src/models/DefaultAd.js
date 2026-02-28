import mongoose from 'mongoose';

const defaultAdSchema = new mongoose.Schema({
  ad_type: {
    type: String,
    enum: ['banner', 'stamp'],
    required: true
  },
  slot_position: {
    type: Number,
    enum: [1, 2, 3, 4],
    required: true
  },
  mobile_image_url: {
    type: String,
    required: true
  },
  desktop_image_url: {
    type: String,
    required: true
  },
  redirect_url: {
    type: String,
    default: null
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  is_active: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 1  // For rotation if multiple defaults for same slot
  }
}, { timestamps: true });

// Compound index for quick lookup
defaultAdSchema.index({ ad_type: 1, slot_position: 1, is_active: 1 });

// Virtual for slot_name (e.g., 'banner_1')
defaultAdSchema.virtual('slot_name').get(function() {
  return `${this.ad_type}_${this.slot_position}`;
});

// Ensure virtuals are included in JSON output
defaultAdSchema.set('toJSON', { virtuals: true });
defaultAdSchema.set('toObject', { virtuals: true });

const DefaultAd = mongoose.model('DefaultAd', defaultAdSchema);
export default DefaultAd;