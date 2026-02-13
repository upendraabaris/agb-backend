import mongoose from 'mongoose';

const CategoryRequestSchema = new mongoose.Schema({
  seller_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  tier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AdTierMaster', required: true },
  request_date: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'running'], default: 'pending' },
}, { timestamps: true });

const CategoryRequest = mongoose.model('CategoryRequest', CategoryRequestSchema);
export default CategoryRequest;
