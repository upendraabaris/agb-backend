import { gql } from "apollo-server";

export const SellerType = gql`
  type Seller {
    id: ID
    superSellerId: [Seller]
    user: User!
    companyName: String!
    bill: String!
    gstin: String
    pancardNo: String
    gstinComposition: Boolean
    address: String
    fullAddress: String!
    city: String!
    state: String!
    pincode: String!
    companyDescription: String!
    mobileNo: String!
    email: String!
    enquiryAssociate: Boolean
    businessAssociate: Boolean
    serviceAssociate: Boolean
    sellerAssociate: Boolean
    emailPermission: Boolean
    whatsAppPermission: Boolean
    whatsAppMobileNo: String
    status: Boolean
    bastatus: Boolean
    dealerstatus: Boolean
    createdAt: String!
    updatedAt: String!
    allotted: [Allotted]
    review: [SellerReview]
    overallrating: Float
    accountHolderName: String
    accountNumber: String
    ifscCode: String
    bankName: String
    branchName: String
    upiId: String
    sellerMasking: Boolean
  }
  type SellerReview {
    id: ID
    productId: ID
    orderId: ID
    description: String
    userRating: Float
    customerName: String
    ratingDate: String
    user: User
    sellerReply: String
    sellerReplyDate: String
    adminReply: String
    adminReplyDate: String
  }

  type Allotted {
    dealerId: ID
    baId: ID
    dastatus: Boolean
    pincode: [Int]
    state: [String]
  }

  type SellerBill {
    id: ID
    billNumber: String
    sellerId: ID
    invoiceDate: String
  }
`;
