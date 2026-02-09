// src/graphql/types/adCategoryTypes.js
import { gql } from "apollo-server";

export const AdCategoryType = gql`
  #graphql
  type AdCategory {
    id: ID!
    name: String!
    ad_slot: String!
    ad_type: String!
    position: String!
    slot_number: Int!
    price: Float!
    priority: Int!
    duration_days: Int!
    is_active: Boolean!
    createdAt: String
    updatedAt: String
  }

  input AdCategoryInput {
    name: String!
    ad_slot: String!
    ad_type: String!
    position: String!
    slot_number: Int!
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
