// src/graphql/types/siteFeaturesTypes.js
import { gql } from "apollo-server";

export const StoreFeatureType = gql`
  #graphql
  type StoreFeature {
    id: ID!
    storeName: String
    key: String
    solt: String
    pincode: Boolean
    online: Boolean
    dmt: Boolean
    cod: Boolean
    associate: Boolean
    fixSeries: Boolean
    customSeries: Boolean
    storeBusinessName: String
    storeBusinessAddress: String
    storeBusinessCity: String
    storeBusinessState: String
    storeBusinessPanNo: String
    storeBusinessGstin: String
    storeBusinessCinNo: String
    comBillFormate: String
    sellerBillFormate: String
    ccKey: String
    ccSolt: String 
    bgColor: String
    fontColor: String
    whatsappAPINo: String
    dtmHelpVideo: String
    sellerMasking: Boolean    
  }
  type Success{
    message: String
  }
`;
