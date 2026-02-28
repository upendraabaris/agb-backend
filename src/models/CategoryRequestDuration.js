import mongoose from 'mongoose';

const CategoryRequestDurationSchema = new mongoose.Schema({
  category_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CategoryRequest', required: true },
  slot: { type: String, enum: ['banner_1','banner_2','banner_3','banner_4','stamp_1','stamp_2','stamp_3','stamp_4'], required: true },
  duration_days: { type: Number, default: 30 },
  start_date: { type: Date },
  end_date: { type: Date },
  status: { type: String, enum: ['pending', 'approved', 'running', 'completed', 'rejected'], default: 'pending' },
  // start preference indicates whether the ad should start immediately or from next quarter
  start_preference: { type: String, enum: ['today', 'next_quarter'], default: 'today' },
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
}, { timestamps: true });

const CategoryRequestDuration = mongoose.model('CategoryRequestDuration', CategoryRequestDurationSchema);
export default CategoryRequestDuration;
