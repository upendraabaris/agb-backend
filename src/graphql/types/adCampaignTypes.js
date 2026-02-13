import { gql } from "apollo-server";

export const AdCampaignType = gql`
  #graphql
  type AdCampaign {
    id: ID!
    ad_id: ID!
    slot_id: ID
    start_date: String
    end_date: String
    status: String
    createdAt: String
    updatedAt: String
  }

  input AdCampaignInput {
    ad_id: ID!
    slot_id: ID
    start_date: String!
    end_date: String!
  }
`;
