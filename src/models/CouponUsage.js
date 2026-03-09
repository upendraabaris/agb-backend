import mongoose from 'mongoose';

const CouponUsageSchema = new mongoose.Schema({
  coupon_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CouponCode', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CategoryRequest' },
  discount_amount: { type: Number, required: true },
}, { timestamps: true });

// Index for fast per-user lookups
CouponUsageSchema.index({ coupon_id: 1, user_id: 1 });

const CouponUsage = mongoose.model('CouponUsage', CouponUsageSchema);
export default CouponUsage;
