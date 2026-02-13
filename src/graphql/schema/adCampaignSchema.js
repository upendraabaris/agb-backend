import { gql } from "apollo-server";
import { AdCampaignType } from "../types/adCampaignTypes.js";

export const AdCampaignSchema = gql`
  ${AdCampaignType}

  type Query {
    adCampaigns: [AdCampaign]
    getAdCampaign(id: ID!): AdCampaign
  }

  type Mutation {
    createAdCampaign(input: AdCampaignInput!): AdCampaign
  }
`;
