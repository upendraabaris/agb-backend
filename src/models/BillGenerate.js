// src/models/BillGenerate.js
import mongoose from "mongoose";

const BillGenerateSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
    },
    packedID: {
      type: String,
      unique: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    listingComm: {
      type: Number,
    },
    productComm: {
      type: Number,
    },
    shippingComm: {
      type: Number,
    },
    fixedComm: {
      type: Number,
    },
    paymentGateway: {
      type: Number,
    },
    tds: {
      type: Number,
    },
    tcs: {
      type: Number,
    },
    gstComm: {
      type: Number,
    },
    orderAmount: {
      type: Number,
    },
    settlementAmount: {
      type: Number,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    payment_status: {
      type: String,
    },
    payment_mode: {
      type: String,
    },
    transaction_ref_no: {
      type: String,
    },
    transaction_date: {
      type: String,
    },
    accounts_status: {
      type: Boolean,
    },
    customer_issue: {
      type: String,
    },
    customer_issue_title: {
      type: String,
    },
    customer_issue_date: {
      type: String,
    },
    images: {
      type: [String],
    },
    issue_resolved_date: {
      type: String,
    },
    billedProducts: [
      {
        productName: {
          type: String,
        },
        variantName: {
          type: String,
        },
        discount: {
          type: Number,
        },
        price: {
          type: Number,
        },
        gst: {
          type: Number,
        },
        qty: {
          type: Number,
        },
      },
    ],
  },
  { timestamps: true }
);

const Bill = mongoose.model("Bill", BillGenerateSchema);

export default Bill;
