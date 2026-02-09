// src/graphql/types/categoryTypes.js

import { gql } from "apollo-server";

export const Ad_hocType = gql`
  type Ad_hoc {
    id: ID!
    userId: User!
    title: String!
    price: String!
  }
  type DeleteFileResponse {
    success: Boolean!
    message: String
  }
`;
