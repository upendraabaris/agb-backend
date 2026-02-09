import { gql } from "apollo-server";
import { B2bType } from "../types/b2bTypes.js";

export const B2bSchema = gql`
  ${B2bType}

  type Query {
    getB2b(id: ID!): B2b
    getAllB2b(
      search: String
      limit: Int
      offset: Int
      sortBy: String
      sortOrder: String
    ): [B2b!]
  }

  type Mutation {
    upgradeUserToB2b(
      companyName: String!
      gstin: String!
      address: String!
      companyDescription: String!
      mobileNo: String!
      email: String!
      status: String!
    ): B2b!

    updateB2b(
      id: ID!
      companyName: String
      gstin: String
      address: String
      companyDescription: String
      mobileNo: String
      email: String
      status: String
    ): B2b!

    deleteB2b(id: ID!): B2b!
  }
`;
