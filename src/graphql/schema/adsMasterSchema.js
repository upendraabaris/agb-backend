import { gql } from "apollo-server";
import { AdsMasterType } from "../types/adsMasterTypes.js";

export const AdsMasterSchema = gql`
  ${AdsMasterType}

  type Query {
    myAds: [AdsMaster]
    getAllAds: [AdsMaster]
    getAdById(id: ID!): AdsMaster
  }

  type Mutation {
    createAdsMaster(input: AdsMasterInput!): AdsMaster
    updateAdsMaster(id: ID!, input: AdsMasterInput!): AdsMaster
    deleteAdsMaster(id: ID!): DeleteResponse
    approveAd(id: ID!, start_date: String!, end_date: String!, slot_id: ID): AdsMaster
    rejectAd(id: ID!, reason: String): AdsMaster
  }
`;
