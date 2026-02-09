// src/models/Accountdetails.js
import mongoose from "mongoose";

const AccountdetailsSchema = new mongoose.Schema(
  {
    account_no: {
      type: String,
    },
    ifsc_code: {
      type: String,
    },
    account_name: {
      type: String,
    },
    bank_name:{
      type: String,
    },
    qr:{
      type:String,
    },
    upi: {
      type: String,
    },
    phone_no: {
      type: String,
    },
    note: {
      type: String,
    },
    notedmt: {
      type: String,
    },
    notedmtstates: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

const Accountdetails = mongoose.model("Accountdetails", AccountdetailsSchema);

export default Accountdetails;
