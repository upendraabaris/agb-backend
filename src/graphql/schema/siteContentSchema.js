import { gql } from "apollo-server";
import { SiteContentType } from "../types/siteContentTypes.js";
export const SiteContentSchema = gql`
  ${SiteContentType}

  type Query {
    getSiteContent(key: String!): SiteContent
  }

  type Mutation {
    updateSiteContent(key: String!, content: String!): SiteContent
    subscriptionletteremail(email: String): SubscriptionLetter
    contactUsMail(
      name: String
      email: String
      mobile: String
      address: String
      state: String
      message: String
    ): SuccessMsg

    sellerRegMail(
      name: String
      description: String
      email: String
      gst: String
      composition: Boolean
      pancardNo: String
      mobile: String
      fulladdress: String
      city: String
      pincode: Int
      state: String      
      plan: String
      type: String
    ): SuccessMsg

    bA_n_dA_RegMail(
      name: String
      description: String
      email: String
      gst: String 
      mobile: String
      fulladdress: String
      city: String
      pincode: Int
      state: String  
      type: String
    ): SuccessMsg

    singleEnquryMail(
      fullname: String
      email: String
      mobile: String
      address: String
      state: String
      message: String
      productname: String
      sellerId: String 
    ): SuccessMsg

    bulkEnquryMail(
      fullname: String
      email: String
      mobile: String
      address: String
      state: String
      message: String
      productname: String
      sellerId: String 
    ): SuccessMsg

    cartEnquryMail(
      firstname: String
      lastname: String
      email: String
      mobile: String
      message: String
      cartDetails: String
    ): SuccessMsg

    whatsAppEnquryMail(      
      mobile: String
      productname: String
    ): SuccessMsg
  }
`;
