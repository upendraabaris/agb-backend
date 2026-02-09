import mongoose from "mongoose";

const QuatationProductSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  quantity: {
    type: Number,
  },
  discount:{
    type:Number,
  },
});

const QuatationSchema = new mongoose.Schema(
  {
    quatationProducts: [QuatationProductSchema],
    customerName:{
      type:String,
    },
    customerAddress:{
      type:String,
    },
    customerGSTIN:{
      type:String,
    },
    customerMobile:{
      type:String,
    },
    customerBusinessName:{
      type:String,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

const Quatation = mongoose.model("Quatation", QuatationSchema);

export default Quatation;
