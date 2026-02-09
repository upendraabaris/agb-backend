// src/models/TMTSeriesProcdut.js
import mongoose from "mongoose";
import Seller from "./Seller.js";
import Category from "./Category.js";

const LocationSchema = new mongoose.Schema({
  pincode: {
    type: [Number],
  },
  b2cdiscount: {
    type: Number,
  },
  b2bdiscount: {
    type: Number,
  },
  unitType: {
    type: String,
  },
  priceType: {
    type: String,
  },
  price: {
    type: Number,
  },
  gstType: {
    type: Boolean,
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
  finalPrice: {
    type: String,
  },
  sectionDiff: {
    type: Number,
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
});

const VariantSchema = new mongoose.Schema({
  variantName: {
    type: String,
  },
  allPincode: {
    type: Boolean,
  },
  moq: {
    type: Number,
  },
  hsn: String,
  silent_features: String,
  tmtserieslocation: [LocationSchema],
});

const FaqSchema = new mongoose.Schema({
  question: {
    type: String,
  },
  answer: {
    type: String,
  },
});

const TMTSeriesProductSchema = new mongoose.Schema(
  {
    categories: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: Category,
    },
    tmtseriesvariant: [VariantSchema],
    faq: [FaqSchema],
    seriesType: {
      type: String,
      enum: ["normal", "tmt"],
    },
    brand_name: String,
    previewName: String,
    fullName: String,
    identifier: {
      type: String,
      unique: true,
    },
    section: {
      type: Boolean,
    },
    thumbnail: String,
    sku: String,
    returnPolicy: String,
    shippingPolicy: String,
    cancellationPolicy: String,
    description: String,
    giftOffer: String,
    sellerNotes: String,
    policy: String,
    video: String,
    youtubeLink: String,
    active: Boolean,
    catalogue: String,
    approve:Boolean,
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
    priceUpdateDate:{
      type:Date,
    },
  },
  { timestamps: true }
);

const TMTSeriesProduct = mongoose.model(
  "TMTSeriesProduct",
  TMTSeriesProductSchema
);
export default TMTSeriesProduct;
