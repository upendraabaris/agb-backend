// src/graphql/types/adCategoryTypes.js
import { gql } from "apollo-server";
import { AdCategoryMasterType } from "./adCategoryMasterTypes.js";

export const AdCategoryType = gql`
  ${AdCategoryMasterType}
  #graphql
  type AdCategory {
    id: ID!
    categoryMasterId: AdCategoryMaster!
    ad_type: String!
    price: Float!
    priority: Int!
    duration_days: Int!
    is_active: Boolean!
    createdAt: String
    updatedAt: String
  }

  input AdCategoryInput {
    categoryMasterId: ID!
    ad_type: String!
    price: Float!
    priority: Int!
    duration_days: Int!
    is_active: Boolean
  }

  type DeleteResponse {
    success: Boolean!
    message: String!
  }
`;
