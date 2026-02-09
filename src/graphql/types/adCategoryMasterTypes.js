import { gql } from "apollo-server";

export const AdCategoryMasterType = gql`
  type AdCategoryMaster {
    id: ID!
    name: String!
    description: String!
    is_active: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  input AdCategoryMasterInput {
    name: String!
    description: String!
    is_active: Boolean
  }

  type DeleteResponse {
    success: Boolean!
    message: String!
  }
`;
