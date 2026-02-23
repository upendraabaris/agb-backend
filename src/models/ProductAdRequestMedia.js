import mongoose from 'mongoose';

const ProductAdRequestMediaSchema = new mongoose.Schema({
    product_ad_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductAdRequest', required: true },
    slot: {
        type: String,
        enum: ['banner_1', 'banner_2', 'banner_3', 'banner_4', 'stamp_1', 'stamp_2', 'stamp_3', 'stamp_4'],
        required: true
    },
    media_type: { type: String, default: 'both' },
    mobile_image_url: { type: String },
    mobile_redirect_url: { type: String },
    desktop_image_url: { type: String },
    desktop_redirect_url: { type: String }
}, { timestamps: true });

const ProductAdRequestMedia = mongoose.model('ProductAdRequestMedia', ProductAdRequestMediaSchema);
export default ProductAdRequestMedia;
