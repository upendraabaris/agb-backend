// src/models/CategoryDefaultAd.js
// Per-category fallback ads set by admin.
// Fallback chain: Paid → CategoryDefaultAd → GlobalDefaultAd
import mongoose from 'mongoose';

const categoryDefaultAdSchema = new mongoose.Schema(
  {
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    ad_type: {
      type: String,
      enum: ['banner', 'stamp'],
      required: true,
    },
    slot_position: {
      type: Number,
      enum: [1, 2, 3, 4],
      required: true,
    },
    mobile_image_url: {
      type: String,
      required: true,
    },
    desktop_image_url: {
      type: String,
      required: true,
    },
    redirect_url: {
      type: String,
      default: null,
    },
    title: {
      type: String,
      default: '',
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// One slot per category — no duplicates
categoryDefaultAdSchema.index(
  { category_id: 1, ad_type: 1, slot_position: 1 },
  { unique: true }
);

// Virtual for slot_name (e.g. 'banner_2')
categoryDefaultAdSchema.virtual('slot_name').get(function () {
  return `${this.ad_type}_${this.slot_position}`;
});

categoryDefaultAdSchema.set('toJSON', { virtuals: true });
categoryDefaultAdSchema.set('toObject', { virtuals: true });

const CategoryDefaultAd = mongoose.model('CategoryDefaultAd', categoryDefaultAdSchema);
export default CategoryDefaultAd;
