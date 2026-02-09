import mongoose from "mongoose";
import User from "./User.js";

const enquerySchema = new mongoose.Schema(
  {
    active: {
      type: Boolean,
      required: true,
    },
    types: {
      type: String,
    },
    message: {
      type: String,
    },
    customerName: {
      type: String,
    },
    email: {
      type: String,
    },
    mobileNo: {
      type: String,
    },
    fullAddress: {
      type: String,
    },
    state: {
      type: String,
    },
    productName: {
      type: String,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,      
    },
  },
  { timestamps: true }
);

const Enquery = mongoose.model("Enquery", enquerySchema);

export default Enquery;
