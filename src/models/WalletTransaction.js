// src/models/WalletTransaction.js
import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
    {
        seller_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Seller",
            required: true,
        },
        type: {
            type: String,
            enum: ["credit", "debit"],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        source: {
            type: String,
            enum: ["payu", "ccavenue", "ad_deduction", "admin_credit", "refund"],
            required: true,
        },
        description: {
            type: String,
        },
        // CCAvenue correlation fields
        ccav_order_id: {
            type: String, // WalletTransaction._id sent as CCAvenue order_id
        },
        ccav_tracking_id: {
            type: String, // tracking_id returned by CCAvenue
        },
        ccav_payment_mode: {
            type: String,
        },
        status: {
            type: String,
            enum: ["pending", "success", "failed"],
            default: "pending",
        },
    },
    { timestamps: true }
);

const WalletTransaction = mongoose.model(
    "WalletTransaction",
    walletTransactionSchema
);

export default WalletTransaction;
