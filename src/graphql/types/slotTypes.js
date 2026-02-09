import { gql } from "apollo-server";

export const SlotType = gql`
  #graphql
  type Slot {
    id: ID!
    ad_slot: String!
    ad_type: String!
    position: String!
    slot_number: Int!
    is_active: Boolean!
    createdAt: String
    updatedAt: String
  }

  input SlotInput {
    ad_slot: String!
    ad_type: String!
    position: String!
    slot_number: Int!
    is_active: Boolean
  }

  type DeleteResponse {
    success: Boolean!
    message: String!
  }
`;
