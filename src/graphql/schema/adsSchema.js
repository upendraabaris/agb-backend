import { gql } from "apollo-server";
import { AdsType } from "../types/adsTypes.js";

export const AdsSchema = gql`
  ${AdsType}

  type Query {
    getAds(key: String!): Ads
  }

  type Mutation {
    updateAds(key: String!, adimage: Upload, active: Boolean, url: String!): Ads
  }
`;
