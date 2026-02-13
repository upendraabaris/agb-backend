import { gql } from "apollo-server";
import { AdTierMasterType } from "../types/adTierMasterTypes.js";

export const AdTierMasterSchema = gql`
  ${AdTierMasterType}
  type Query {
    adTierMasters: [AdTierMaster]
    allAdTierMasters: [AdTierMaster]
    getAdTierMaster(id: ID!): AdTierMaster
    getAdTierMasterByName(name: String!): AdTierMaster
  }

  type Mutation {
    createAdTierMaster(input: AdTierMasterInput!): AdTierMaster
    updateAdTierMaster(id: ID!, input: AdTierMasterInput!): AdTierMaster
    deleteAdTierMaster(id: ID!): DeleteResponse
    toggleAdTierMasterStatus(id: ID!): AdTierMaster
  }
`;
