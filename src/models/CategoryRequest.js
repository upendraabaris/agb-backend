import mongoose from 'mongoose';

const CategoryRequestSchema = new mongoose.Schema({
  // seller_id stores User._id (used by both sellers and ad managers)
  seller_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  tier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AdTierMaster', required: true },
  request_date: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'running', 'completed'], default: 'pending' },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approved_date: { type: Date },
  rejection_reason: { type: String },
  total_cost: { type: Number },
  held_amount: { type: Number, default: 0 }
}, { timestamps: true });

const CategoryRequest = mongoose.model('CategoryRequest', CategoryRequestSchema);
export default CategoryRequest;
