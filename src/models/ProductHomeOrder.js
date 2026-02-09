// src/models/ProductHomeOrder.js
import mongoose from "mongoose";

const ProductHomeOrderSchema = new mongoose.Schema(
  {
    displaySection: {
      type: String,
      enum: ["tranding", "disply", "discover"],
    },
    displayOrder: {
      type: Number,
    },
    productType: {
      type: String,
      enum: ["single", "custom series", "fix series"],
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

const ProductHomeOrder = mongoose.model("ProductHomeOrder", ProductHomeOrderSchema);

export default ProductHomeOrder;
