// src/models/SellerBill.js
import mongoose from "mongoose";

const SellerBillSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    invoiceDate: {
      type: String,
    },
  },
  { timestamps: true }
);

const SellerBill = mongoose.model("SellerBill", SellerBillSchema);

export default SellerBill;
