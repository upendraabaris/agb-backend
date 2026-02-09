// src/graphql/types/b2bTypes.js

import { gql } from "apollo-server";

export const B2bType = gql`
  type B2b {
    id: ID!
    user: User!
    companyName: String!
    gstin: String!
    address: String!
    companyDescription: String!
    mobileNo: String!
    email: String!
    status: String!
    createdAt: String!
    updatedAt: String!
  }
`;
