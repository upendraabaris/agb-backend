import mongoose from 'mongoose';

const CategoryRequestMediaSchema = new mongoose.Schema({
  category_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CategoryRequest', required: true },
  slot: { type: String, enum: ['banner_1','banner_2','banner_3','banner_4','stamp_1','stamp_2','stamp_3','stamp_4'], required: true },
  media_type: { type: String, default: 'both' },
  mobile_image_url: { type: String },
  desktop_image_url: { type: String },
  redirect_url: { type: String },
  url_type: { type: String, enum: ['internal', 'external'], default: 'external' },
}, { timestamps: true });

const CategoryRequestMedia = mongoose.model('CategoryRequestMedia', CategoryRequestMediaSchema);
export default CategoryRequestMedia;
