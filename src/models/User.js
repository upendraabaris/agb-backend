// src/models/User.js
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
const Schema = mongoose.Schema;

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "5m";

const UserSchema = new Schema(
  {
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
    },
    mobileNo: {
      type: String,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilepic: {
      type: String,
    },
    role: {
      type: [String],
      default: ["customer"],
      enum: [
        "customer",
        "masterAdmin",
        "admin",
        "enquiry",
        "service",
        "seller",
        "superSeller",
        "subBusiness",
        "b2b",
        "categoryManager",
        "accounts",
        "sellerManager",
        "siteManager",
        "blogManager",
        "seriesManager",
        "attribueManager",
        "b2bManager",
        "inventoryManager",
        "orderManager",
        "productPriceUpdateManager",
      ],
    },
    addresses: [
      {
        type: Schema.Types.ObjectId,
        ref: "Address",
      },
    ],
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
    },
    refreshTokenHash: {
      type: String,
    },
    refreshTokenExpiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

UserSchema.methods.generateAuthToken = function () {
  const token = jwt.sign({ _id: this._id }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
  return token;
};

const User = mongoose.model("User", UserSchema);
export default User;
