// src/models/ProcdutAttribute.js
import mongoose from "mongoose";

const GSTSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    gstRate: { type: Number, required: true },
  },
  { timestamps: true }
);

const UnitTypeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    symbol: { type: String, required: true },
  },
  { timestamps: true }
);

const PriceTypeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    symbol: { type: String, required: true },
  },
  { timestamps: true }
);

const ExtraChargeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
  },
  { timestamps: true }
);

const TransportChargeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
  },
  { timestamps: true }
);

const FinalPriceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
  },
  { timestamps: true }
);

const ProductAttributeSchema = new mongoose.Schema(
  {
    gst: [GSTSchema],
    unitType: [UnitTypeSchema],
    priceType: [PriceTypeSchema],
    extraCharge: [ExtraChargeSchema],
    transportCharge: [TransportChargeSchema],
    finalPrice: [FinalPriceSchema],
  },
  { timestamps: true }
);

const ProductAttribute = mongoose.model(
  "ProductAttribute",
  ProductAttributeSchema
);

export default ProductAttribute;
