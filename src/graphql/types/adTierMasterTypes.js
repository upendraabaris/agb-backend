import { gql } from "apollo-server";

export const AdTierMasterType = gql`
  type AdTierMaster {
    id: ID!
    name: String!
    description: String!
    is_active: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  input AdTierMasterInput {
    name: String!
    description: String!
    is_active: Boolean
  }

  type DeleteResponse {
    success: Boolean!
    message: String!
  }
`;
