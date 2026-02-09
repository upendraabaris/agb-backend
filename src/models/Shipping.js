// src/models/Shipping.js
import mongoose from "mongoose";

const shippingSchema = new mongoose.Schema(
  {
    shipping_company: {
      type: String,
      required: true,
      unique: true,      
    },
    url: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },
    api: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Shipping = mongoose.model("Shipping", shippingSchema);

export default Shipping;
