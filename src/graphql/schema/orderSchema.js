import { gql } from "apollo-server";
import { OrderType } from "../types/orderTypes.js";

export const OrderSchema = gql`
  ${OrderType}

  type Query {
    getOrder(id: ID!): Order
    getOrderForHomePage(id: ID!): Order
    getSingleOrderBySellerId(sellerId: ID, orderId: ID): Order
    getAllOrder(
      search: String
      limit: Int
      offset: Int
      sortBy: String
      sortOrder: String
    ): [Order!]
    getOrderForseller: [Order]
    getSellerIssueOrders: [Order]
    getOrderBySellerId(sellerId: ID): [Order]
    getUserorder: [Order]
    getUserAllOrder(userId: ID): [Order]
    getSingleOrderForseller(id: ID): Order
    getBillByPackedId(packedID: String): Bill
    getAllBills: [Bill]
    getSellerOrderWithDate(
      startDate: String
      endDate: String
      sellerId: ID
    ): [Order]
    getSellerBillWithDate(year: Int, month: Int, sellerId: ID): [Bill]
  }

  type Mutation {
    createOrder(
      paymentMethod: String
      totalAmount: Float
      acutalTotalAmount: Float
      shippingAmount: Float
      orderProducts: [OrderProducts]
      shippingAddress: ID
      billingAddress: ID
      freeDelivery: Boolean
      status: String
      couponName: String
      couponDiscount: Float
      onlinePaymentCharge: Float
      dmtPaymentDiscount: Float
      couponDiscountPercentage: Float
      onlinePaymentChargePercentage: Float
      dmtPaymentDiscountPercentage: Float
    ): Order!

    createBill(
      packedID: String
      billedProducts: [BilledProducts]
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
      sellerId: ID
      payment_status: String
      payment_mode: String
      transaction_ref_no: String
      transaction_date: String
      accounts_status: Boolean
    ): Bill!

    updateBillPayment(
      id: ID!
      payment_status: String
      payment_mode: String
      transaction_ref_no: String
      transaction_date: String
    ): Bill

    customerIssue(
      id: ID!
      customer_issue: String
      customer_issue_date: String
      customer_issue_title: String
      images: [Upload]
      issue_resolved_date: String
    ): Bill

    customerIssueResolve(id: ID!): Bill

    orderPacked(
      id: ID
      status: String
      orderProducts: [OrderProducts]
      file: Upload
      packedDate: String
    ): Order

    orderShipped(
      id: ID
      status: String
      orderProducts: [OrderProducts]
      file: Upload
      shippedBy: String
      trackingNo: String
      trackingUrl: String
      shippedDate: String
    ): Order
    orderDelivered(
      id: ID
      status: String
      deliveredDate: String
      orderProducts: [OrderProducts]
    ): Order
    submutPaymentProof(
      orderId: ID
      paymentMethod: String
      file: Upload
      paymentId: String
      paymentStatus: String
      paymentmode: String
    ): Order!

    updateOrder(
      id: ID!
      paymentMethod: String
      totalAmount: Float
      shippingAddress: ID
      billingAddress: ID
      status: String
      freeDelivery: Boolean
    ): Order!

    deleteOrder(id: ID!): Order!
    updateSellerId(id: ID!, sellerId: ID!): Order

    updatePaymentProofStatus(
      id: ID!
      paymentStatus: String!
      paymentfailedReason: String
    ): Order
    cancelOrder(id: ID!, orderCancelledReason: String!): Order
  }

  input OrderProducts {
    productId: ID
    variantId: ID
    locationId: ID
    iprice: Float
    igst: Float
    pending: Boolean
    packed: Boolean
    shipped: Boolean
    delivered: Boolean
    cancelled: Boolean
    packedDate: String
    shippedDate: String
    deliveredDate: String
    idiscount: Int
    iextraChargeType: String
    iextraCharge: Float
    itransportChargeType: String
    itransportCharge: Float
    price: Float
    quantity: Int
    sellerId: ID
  }

  input BilledProducts {
    productName: String!
    variantName: String!
    discount: Int!
    price: Float!
    gst: Float!
    qty: Int!
  }
`;
