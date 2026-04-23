// src/models/WalletInvoice.js
// Invoice generated for each successful wallet top-up (via PayU or CCAvenue).
import mongoose from "mongoose";

const WalletInvoiceSchema = new mongoose.Schema(
  {
    // Sequential invoice number: WINV/{FY}/{seq} e.g. WINV/2526/0001
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
    },
    seller_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    transaction_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    // Payment gateway reference returned by PayU (payuMoneyId or bank_ref_num)
    gatewayTransactionId: {
      type: String,
    },
    paymentMode: {
      type: String,
    },
    paymentGateway: {
      type: String,
      enum: ["payu", "ccavenue"],
      default: "payu",
    },
    description: {
      type: String,
      default: "Wallet Top-up",
    },
    // Snapshot of buyer info at time of invoice (immutable audit record)
    buyerName: {
      type: String,
    },
    buyerCompany: {
      type: String,
    },
    buyerEmail: {
      type: String,
    },
    buyerPhone: {
      type: String,
    },
    // GST breakdown snapshot
    baseAmount: { type: Number },       // wallet credit amount (before GST)
    gstRate: { type: Number },       // 18
    gstType: { type: String, enum: ['cgst_sgst', 'igst'] },
    cgstRate: { type: Number },       // 9 or 0
    cgstAmount: { type: Number },
    sgstRate: { type: Number },       // 9 or 0
    sgstAmount: { type: Number },
    igstRate: { type: Number },       // 0 or 18
    igstAmount: { type: Number },
    totalAmount: { type: Number },       // baseAmount + all GST
    buyerState: { type: String },
    companyState: { type: String },
  },
  { timestamps: true }
);

const WalletInvoice = mongoose.model("WalletInvoice", WalletInvoiceSchema);

export default WalletInvoice;
