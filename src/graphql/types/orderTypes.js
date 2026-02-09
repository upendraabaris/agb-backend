// src/graphql/types/ordreTypes.js

import { gql } from "apollo-server";

export const OrderType = gql`
  type OrderProduct {
    productId: Product
    variantId: Variant
    locationId: Location
    iprice: Float
    igst: Float
    idiscount: Int
    iextraChargeType: String
    iextraCharge: Float
    itransportChargeType: String
    itransportCharge: Float
    price: Float
    quantity: Int
    sellerId: Seller
    packedImage: String
    shippedImage: String
    shippedBy: String
    trackingNo: String
    trackingUrl: String
    packed: Boolean
    pending: Boolean
    shipped: Boolean
    delivered: Boolean
    packageIdentifier: String
    productStatus: String
    cancelled: Boolean
    packedDate: String
    shippedDate: String
    deliveredDate: String
  }
  type OrderAddress {
    firstName: String
    lastName: String
    mobileNo: String
    addressLine1: String!
    addressLine2: String
    city: String!
    state: String!
    postalCode: String!
    country: String!
    altrMobileNo: String
    businessName: String
    gstin: String
  }
  type Order {
    id: ID
    user: User
    paymentMethod: String
    totalAmount: Float
    acutalTotalAmount: Float
    shippingAmount: Float
    orderProducts: [OrderProduct]
    shippingAddress: OrderAddress
    billingAddress: OrderAddress
    status: String
    paymentStatus: String
    paymentProof: String
    paymentId: String
    onlinepaymentStatus: String
    paymentfailedReason: String
    paymentGatewayResponse: String
    paymentmode: String
    freeDelivery: Boolean
    couponName: String
    couponDiscount: Float
    onlinePaymentCharge: Float
    dmtPaymentDiscount: Float
    couponDiscountPercentage: Float
    onlinePaymentChargePercentage: Float
    dmtPaymentDiscountPercentage: Float
    orderCancelledReason: String
    orderCancelledDate: String
    createdAt: String
  }

  type BillProduct {
    productName: String
    variantName: String
    discount: Int
    price: Float
    gst: Float
    qty: Int
  }

  type Bill {
    id: ID
    billNumber: String
    sellerId: ID
    packedID: String
    billedProducts: [BillProduct]
    createdAt: String
    listingComm: Float
    productComm: Float
    shippingComm: Float
    fixedComm: Float
    paymentGateway: Float
    tds: Float
    tcs: Float
    gstComm: Float
    orderAmount: Float
    settlementAmount: Float
    orderId: ID
    payment_status: String
    payment_mode: String
    transaction_ref_no: String
    transaction_date: String
    accounts_status: Boolean
    customer_issue: String
    customer_issue_date: String
    images: [String]
    customer_issue_title: String
    issue_resolved_date: String
  }
`;
