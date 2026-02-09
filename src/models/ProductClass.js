// src/models/ProductClass.js
import mongoose from "mongoose";

const ProductClassSchema = new mongoose.Schema(
  {
    productClassName: { type: String },
    productClassDescription: { type: String },
    code: { type: String, unique: true },
    listingCommission: { type: Number },
    listingType: { type: String },
    productCommission: { type: Number },
    productType: { type: String },
    fixedCommission: { type: Number },
    fixedType: { type: String },
    shippingCommission: { type: Number },
    shippingType: { type: String },
    specialStatus: { type: Boolean },
  },
  { timestamps: true }
);

const ProductClass = mongoose.model("ProductClass", ProductClassSchema);
export default ProductClass;