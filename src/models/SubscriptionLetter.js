// src/models/SubscriptionLetter.js
import mongoose from "mongoose";

const SubscriptionLetterSchema = new mongoose.Schema(
  {
    email:{
        type:String,
        unique:true,
    },
  },
  { timestamps: true }
);

const SubscriptionLetter = mongoose.model("SubscriptionLetter", SubscriptionLetterSchema);

export default SubscriptionLetter;
