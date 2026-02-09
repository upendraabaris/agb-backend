// src/models/Inventory.js
import mongoose from "mongoose";

const InventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    currentStock: { type: Number },
    displayStock: { type: Number },
  },
  { timestamps: true }
);

const Inventory = mongoose.model("Intentory", InventorySchema);

export default Inventory;
