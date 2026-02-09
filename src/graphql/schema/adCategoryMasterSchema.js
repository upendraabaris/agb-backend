import { gql } from "apollo-server";
import { AdCategoryMasterType } from "../types/adCategoryMasterTypes.js";

export const AdCategoryMasterSchema = gql`
  ${AdCategoryMasterType}
  type Query {
    adCategoryMasters: [AdCategoryMaster]
    allAdCategoryMasters: [AdCategoryMaster]
    getAdCategoryMaster(id: ID!): AdCategoryMaster
    getAdCategoryMasterByName(name: String!): AdCategoryMaster
  }

  type Mutation {
    createAdCategoryMaster(input: AdCategoryMasterInput!): AdCategoryMaster
    updateAdCategoryMaster(id: ID!, input: AdCategoryMasterInput!): AdCategoryMaster
    deleteAdCategoryMaster(id: ID!): DeleteResponse
    toggleAdCategoryMasterStatus(id: ID!): AdCategoryMaster
  }
`;
