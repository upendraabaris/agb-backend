// src/models/TMTSeriesProcdut.js
import mongoose from "mongoose";
import Seller from "./Seller.js";
import Category from "./Category.js";

const SellerArraySchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: Seller,
  },
  pincode: {
    type: [Number],
  },
  status: {
    type: Boolean,
  },
});

const SuperLocationSchema = new mongoose.Schema({
  pincode: {
    type: [Number],
  },
  allPincode: {
    type: Boolean,
  },
  status: {
    type: Boolean,
  },
  mainStock: {
    type: Number,
  },
  displayStock: {
    type: Number,
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: Seller,
  },
  unitType: {
    type: String,
  },
  finalPrice: {
    type: String,
  },
  priceType: {
    type: String,
  },
  price: {
    type: Number,
  },
  gstRate: {
    type: Number,
  },
  extraChargeType: {
    type: String,
  },
  extraCharge: {
    type: Number,
  },
  transportChargeType: {
    type: String,
  },
  transportCharge: {
    type: Number,
  },
  b2cdiscount: {
    type: Number,
  },
  b2bdiscount: {
    type: Number,
  },
  state: {
    type: String,
  },
  sellerarray: [SellerArraySchema],
});

const SuperVariantSchema = new mongoose.Schema({
  variantName: {
    type: String,
  },
  hsn: String,
  status: Boolean,
  superlocation: [SuperLocationSchema],
});

const SuperFaqSchema = new mongoose.Schema({
  question: {
    type: String,
  },
  answer: {
    type: String,
  },
});

const SuperSellerProductSchema = new mongoose.Schema(
  {
    superSellerId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    categories: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: Category,
    },
    supervariant: [SuperVariantSchema],
    faq: [SuperFaqSchema],
    seriesType: {
      type: String,
      enum: ["normal", "tmt", "super"],
    },
    brand_name: String,
    previewName: String,
    fullName: String,
    identifier: {
      type: String,
      unique: true,
    },
    silent_features: String,
    thumbnail: String,
    sku: String,
    returnPolicy: String,
    shippingPolicy: String,
    cancellationPolicy: String,
    description: String,
    giftOffer: String,
    sellerNotes: String,
    video: String,
    youtubeLink: String,
    active: Boolean,
    catalogue: String,
    approve: Boolean,
    reject: Boolean,
    rejectReason: String,
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
    brandCompareCategory: String,
    images: {
      type: [String],
    },
    priceUpdateDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

const SuperSellerProduct = mongoose.model(
  "SuperSellerProduct",
  SuperSellerProductSchema
);
export default SuperSellerProduct;
