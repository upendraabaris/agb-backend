import mongoose from 'mongoose';

const ProductAdRequestDurationSchema = new mongoose.Schema({
    product_ad_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductAdRequest', required: true },
    slot: {
        type: String,
        enum: ['banner_1', 'banner_2', 'banner_3', 'banner_4', 'stamp_1', 'stamp_2', 'stamp_3', 'stamp_4'],
        required: true
    },
    duration_days: { type: Number, default: 90 },
    start_date: { type: Date },
    end_date: { type: Date },
    status: { type: String, enum: ['pending', 'approved', 'running', 'completed', 'rejected'], default: 'pending' },
    // start preference indicates whether the ad should start immediately or from next quarter
    start_preference: { type: String, enum: ['today', 'next_quarter', 'select_quarter'], default: 'today' },
    // selected quarter (e.g. "Q2 2026") when start_preference === 'select_quarter'
    selected_quarter: { type: String },
    // which quarters (Q1..Q4) this duration spans
    quarters_covered: [{ type: String }],
    // pricing breakdown per quarter
    pricing_breakdown: [{
        quarter: { type: String },
        start: { type: Date },
        end: { type: Date },
        days: { type: Number },
        rate_per_day: { type: Number },
        subtotal: { type: Number }
    }],
    total_price: { type: Number, default: 0 },
    coupon_code: { type: String, default: null },
    coupon_discount_type: { type: String, enum: ['percentage', 'flat', null], default: null },
    coupon_discount_value: { type: Number, default: 0 },
    coupon_discount_amount: { type: Number, default: 0 },
    final_price: { type: Number, default: 0 }
}, { timestamps: true });

const ProductAdRequestDuration = mongoose.model('ProductAdRequestDuration', ProductAdRequestDurationSchema);
export default ProductAdRequestDuration;
