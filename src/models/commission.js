// src/models/Commission.js
import mongoose from "mongoose";

const commissionSchema = new mongoose.Schema(
  {
    productType:{
        type:String,
    },
    listingCommType: {
        type: String,
        enum: ["fix", "percentage"],
      },
      listingComm: {
        type: Number,
      },
      productCommType: {
        type: String,
        enum: ["fix", "percentage"],
      },
      productComm: {
        type: Number,
      },
      shippingCommType: {
        type: String,
        enum: ["fix", "percentage"],
      },
      shippingComm: {
        type: Number,
      },
      fixedCommType: {
        type: String,
        enum: ["fix", "percentage"],
      },
      fixedComm: {
        type: Number,
      },
  },
  { timestamps: true }
);

const Commission = mongoose.model("Commission", commissionSchema);

export default Commission;
