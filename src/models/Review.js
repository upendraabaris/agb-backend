// src/models/Review.js
import mongoose from "mongoose";
import User from "./User.js";

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: User,
    },
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    images: {
      type: [String],
    },
    rating: {
      type: Number,
    },
    repliesSeller: {
      type: String,
    },
    repliesSellerDate: {
      type: String,
    },
    repliesAdmin: {
      type: String,
    },
    repliesAdminDate: {
      type: String,
    },
  },
  { timestamps: true }
);

const Review = mongoose.model("Review", reviewSchema);

export default Review;
