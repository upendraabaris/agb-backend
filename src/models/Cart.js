import mongoose from "mongoose";

const CartProductSchema = new mongoose.Schema({
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
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  quantity: {
    type: Number,
  },
  iprice: {
    type: Number,
  },
  igst: {
    type: Number,
  },
  idiscount: {
    type: Number,
  },
  iextraChargeType: {
    type: String,
  },
  iextraCharge: {
    type: Number,
  },
  itransportChargeType: {
    type: String,
  },
  itransportCharge: {
    type: Number,
  },
});

const CartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cartProducts: [CartProductSchema], // Renamed from "cartproduct" to "cartProducts"
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", CartSchema);

export default Cart;
