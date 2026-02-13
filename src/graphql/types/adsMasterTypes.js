import { gql } from "apollo-server";

export const AdsMasterType = gql`
  #graphql
  type AdsMaster {
    id: ID!
    sellerId: ID!
    ad_category_id: ID!
    slot_id: ID
    mobile_image_url: String
    mobile_redirect_url: String
    desktop_image_url: String
    desktop_redirect_url: String
    status: String
    createdAt: String
    updatedAt: String
  }

  input AdsMasterInput {
    ad_category_id: ID!
    slot_id: ID
    mobile_image_url: String
    mobile_redirect_url: String
    desktop_image_url: String
    desktop_redirect_url: String
  }

  type DeleteResponse {
    success: Boolean!
    message: String!
  }
`;
