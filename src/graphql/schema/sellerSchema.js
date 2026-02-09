import { gql } from "apollo-server";
import { SellerType } from "../types/sellerTypes.js";

export const SellerSchema = gql`
  ${SellerType}

  type DeliveredOrderSummary {
    count: Int
    totalAmount: Float
  }

  type Query {
    getAllSellerForSuperSeller: [Seller]
    getSeller(id: ID!): Seller
    getSellerPermission: Seller
    getSuperSellerProductForSeller: [SuperSellerProduct]
    getDeliveredOrderSummary: DeliveredOrderSummary
    getAllSellers(
      search: String
      limit: Int
      offset: Int
      sortBy: String
      sortOrder: String
    ): [Seller!]
    getAllSuperSellers(
      search: String
      limit: Int
      offset: Int
      sortBy: String
      sortOrder: String
    ): [Seller!]
    getBAallDa(baID: ID!): [Seller!]
    getAllEnquiry(
      search: String
      limit: Int
      offset: Int
      sortBy: String
      sortOrder: String
    ): [Seller!]
    getAllSellersByExactMatch(
      search: String
      limit: Int
      offset: Int
      sortBy: String
      sortOrder: String
    ): [Seller!]
  }

  type Mutation {
    upgradeUserToSeller(
      userId: ID!
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
      sellerMasking: Boolean
    ): Seller!

    updateSeller(
      id: ID!
      companyName: String
      bill: String
      gstin: String
      pancardNo: String
      gstinComposition: Boolean
      address: String
      fullAddress: String
      city: String
      state: String
      pincode: String
      companyDescription: String
      mobileNo: String
      email: String
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
      accountHolderName: String
      accountNumber: String
      ifscCode: String
      bankName: String
      branchName: String
      upiId: String
      sellerMasking: Boolean
    ): Seller!

    updateDealerPincode(
      id: ID!
      dealerId: ID
      baId: ID
      dastatus: Boolean
      pincode: [Int]
      state: [String]
    ): Seller!

    updateSellerReview(
      id: ID!
      description: String
      rating: Float
      customerName: String
      ratingDate: String
      userId: ID
      sellerReply: String
      sellerReplyDate: String
      adminReply: String
      adminReplyDate: String
    ): Seller!

    addSellerReply(
      reviewId: ID!
      sellerId: ID!
      sellerReply: String
      adminReply: String
    ): Seller!
    deleteSeller(id: ID!): Seller!
    approveSuperSeller(sellerid: ID, superSellerID: ID): Seller
    approveBySuperSeller(sellerid: ID): Seller
    daApproveByPortalAdmin(sellerid: ID!, baID: ID!): Seller
    generateSellerBill(sellerid: ID, invoicedate: String): SellerBill
  }
`;
