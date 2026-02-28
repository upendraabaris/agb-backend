import mongoose from 'mongoose';

const ProductAdRequestDurationSchema = new mongoose.Schema({
    product_ad_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductAdRequest', required: true },
    slot: {
        type: String,
        enum: ['banner_1', 'banner_2', 'banner_3', 'banner_4', 'stamp_1', 'stamp_2', 'stamp_3', 'stamp_4'],
        required: true
    },
    duration_days: { type: Number, default: 30 },
    start_date: { type: Date },
    end_date: { type: Date },
    status: { type: String, enum: ['pending', 'running', 'completed'], default: 'pending' }
}, { timestamps: true });

const ProductAdRequestDuration = mongoose.model('ProductAdRequestDuration', ProductAdRequestDurationSchema);
export default ProductAdRequestDuration;
