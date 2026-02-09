import { gql } from "apollo-server";

import { StoreFeatureType } from "../types/storeFeatureTypes.js";
export const StoreFeatureSchema = gql`
  ${StoreFeatureType}

  type Query {
    getStoreFeature: StoreFeature
  }

  type Mutation {
    createStoreFeature(
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
    ): StoreFeature!    

    addAdminRole(userID:ID):Success
    removeAdminRole(userID:ID):Success
  }
`;
