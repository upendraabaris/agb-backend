// src/models/Order.js
import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
    },
    orderProducts: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        variantId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        locationId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        price: {
          type: Number,
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
        sellerId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        packedImage: {
          type: String,
        },
        shippedImage: {
          type: String,
        },
        shippedBy: {
          type: String,
        },
        trackingNo: {
          type: String,
        },
        trackingUrl: {
          type: String,
        },
        packageIdentifier: {
          type: String,
        },
        productStatus: {
          type: String,
        },
        pending: {
          type: Boolean,
          default: true,
        },
        packed: {
          type: Boolean,
          default: false,
        },
        shipped: {
          type: Boolean,
          default: false,
        },
        delivered: {
          type: Boolean,
          default: false,
        },
        cancelled: {
          type: Boolean,
          default: false,
        },
        packedDate: {
          type: Date,
        },
        shippedDate: {
          type: Date,
        },
        deliveredDate: {
          type: Date,
        },
      },
    ],
    paymentMethod: {
      type: String,
    },
    paymentmode: {
      type: String,
    },
    totalAmount: {
      type: Number,
    },
    acutalTotalAmount: {
      type: Number,
    },
    shippingAmount: {
      type: Number,
    },
    freeDelivery: {
      type: Boolean,
      default: false,
    },
    shippingAddress: {
      firstName: {
        type: String,
      },
      lastName: {
        type: String,
      },
      mobileNo: {
        type: String,
      },
      addressLine1: {
        type: String,
        required: true,
      },
      addressLine2: {
        type: String,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      postalCode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
      },
      altrMobileNo:{
        type:String,
      },
      businessName:{
        type:String,
      },
      gstin:{
        type:String,
      },
    },
    billingAddress: {
      firstName: {
        type: String,
      },
      lastName: {
        type: String,
      },
      mobileNo: {
        type: String,
      },
      addressLine1: {
        type: String,
        required: true,
      },
      addressLine2: {
        type: String,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      postalCode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
      },
      altrMobileNo:{
        type:String,
      },
      businessName:{
        type:String,
      },
      gstin:{
        type:String,
      },
    },
    status: {
      type: String,
      enum: ["pending", "delivered", "cancelled", "shipped", "packed"],
    },
    onlinepaymentStatus: {
      type: String,
    },
    paymentGatewayResponse: {
      type: String,
    },
    paymentStatus: {
      type: String,
      default: "pending",
      enum: ["pending", "failed", "complete", "Payment Proof Submited"],
    },
    paymentfailedReason: {
      type: String,
    },
    paymentProof: {
      type: String,
    },
    paymentId: {
      type: String,
    },
    couponName: {
      type: String,
    },
    couponDiscount: {
      type: Number,
    },
    onlinePaymentCharge: {
      type: Number,
    },
    dmtPaymentDiscount: {
      type: Number,
    },
    couponDiscountPercentage: {
      type: Number,
    },
    onlinePaymentChargePercentage: {
      type: Number,
    },
    dmtPaymentDiscountPercentage: {
      type: Number,
    },
    orderCancelledReason: {
      type: String,
    },
    orderCancelledDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);

export default Order;
