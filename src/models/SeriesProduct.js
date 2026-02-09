// src/models/ProcdutAttribute.js
import mongoose from "mongoose";
import Seller from "./Seller.js";
import Category from "./Category.js";

const LocationSchema = new mongoose.Schema({
  pincode: {
    type: [Number],
  },
  allPincode: {
    type: Boolean,
  },
  state: {
    type: [String],
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
  active: Boolean,
  hsn: String,
  silent_features: String,
  serieslocation: [LocationSchema],

  finalPrice: {
    type: String,
  },
  transportChargeType: {
    type: String,
  },
  extraChargeType: {
    type: String,
  },
  gstType: {
    type: Boolean,
  },
  gstRate: {
    type: Number,
  },
  unitType: {
    type: String,
  },
  priceType: {
    type: String,
  },
});

const FaqSchema = new mongoose.Schema({
  question: {
    type: String,
  },
  answer: {
    type: String,
  },
});

const SeriesProductSchema = new mongoose.Schema(
  {
    categories: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: Category,
    },
    seriesvariant: [VariantSchema],
    faq: [FaqSchema],
    seriesType: {
      type: String,
      enum: ["normal", "tmt", "multiseller"],
    },
    brand_name: String,
    previewName: String,
    fullName: String,
    identifier: {
      type: String,
      unique: true,
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
    table: Boolean,
    catalogue: String,
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
    images: {
      type: [String],
    },
    table: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

const SeriesProduct = mongoose.model("SeriesProduct", SeriesProductSchema);
export default SeriesProduct;
