import mongoose from 'mongoose';

const ProductAdRequestSchema = new mongoose.Schema({
    seller_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    tier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AdTierMaster', required: true },
    request_date: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'running'], default: 'pending' },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approved_date: { type: Date },
    rejection_reason: { type: String }
}, { timestamps: true });

const ProductAdRequest = mongoose.model('ProductAdRequest', ProductAdRequestSchema);
export default ProductAdRequest;
