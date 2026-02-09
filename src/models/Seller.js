// src/models/Seller.js

import mongoose from "mongoose";
import User from "./User.js";

const sellerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: User,
      required: true,
    },
    superSellerId: {
      type: [mongoose.Schema.Types.ObjectId],
    },
    companyName: {
      type: String,
      required: true,
    },
    bill: {
      type: String,
      required: true,
    },
    gstin: {
      type: String,
    },
    gstinComposition: {
      type: Boolean,
    },
    pancardNo: {
      type: String,
    },
    address: {
      type: String,
    },
    fullAddress: {
      type: String,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    pincode: {
      type: String,
      required: true,
    },
    companyDescription: {
      type: String,
      required: true,
    },
    mobileNo: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    enquiryAssociate: {
      type: Boolean,
    },
    businessAssociate: {
      type: Boolean,
    },
    serviceAssociate: {
      type: Boolean,
    },
    sellerAssociate: {
      type: Boolean,
    },
    whatsAppPermission: {
      type: Boolean,
    },
    emailPermission: {
      type: Boolean,
    },
    whatsAppMobileNo: {
      type: String,
    },
    status: {
      type: Boolean,
    },
    bastatus: {
      type: Boolean,
    },
    dealerstatus: {
      type: Boolean,
    },
    allotted: [
      {
        dealerId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        dastatus: {
          type: Boolean,
        },
        baId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        pincode: {
          type: [Number],
        },
        state: {
          type: [String],
        },
      },
    ],
    review: [
      {
        description: {
          type: String,
        },
        userRating: {
          type: Number,
        },
        customerName: {
          type: String,
        },
        ratingDate: {
          type: String,
        },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: User,
        },
        sellerReply: {
          type: String,
        },
        sellerReplyDate: {
          type: String,
        },
        adminReply: {
          type: String,
        },
        adminReplyDate: {
          type: String,
        },
      },
    ],
    overallrating: {
      type: Number,
    },
    accountHolderName: {
      type: String,
    },
    accountNumber: {
      type: String,
    },
    ifscCode: {
      type: String,
    },
    bankName: {
      type: String,
    },
    branchName: {
      type: String,
    },
    upiId: {
      type: String,
    },
    sellerMasking: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Seller = mongoose.model("Seller", sellerSchema);

export default Seller;
