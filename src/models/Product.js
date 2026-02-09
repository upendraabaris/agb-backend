// src/models/ProcdutAttribute.js
import mongoose from "mongoose";
import Seller from "./Seller.js";
import Category from "./Category.js";

const LocationSchema = new mongoose.Schema({
  pincode: {
    type: [Number],
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
  priceType: {
    type: String,
  },
  unitType: {
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
  moq: {
    type: Number,
  },
  minimunQty: {
    type: Number,
  },
  allPincode: {
    type: Boolean,
  },
  hsn: String,
  silent_features: String,
  active: Boolean,
  location: [LocationSchema],
});

const FaqSchema = new mongoose.Schema({
  question: {
    type: String,
  },
  answer: {
    type: String,
  },
});

const ProductSchema = new mongoose.Schema(
  {
    categories: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: Category,
    },
    variant: [VariantSchema],
    faq: [FaqSchema],
    brand_name: String,
    previewName: String,
    searchName: String,
    fullName: {
      type: String,
    },
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
    catalogue: String,
    approve: Boolean,
    active: Boolean,
    reject: Boolean,
    rejectReason: String,
    classCode: String,
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
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", ProductSchema);
export default Product;
