import { gql } from "apollo-server";
import { EnqueryType } from "../types/enqueryTypes.js";

export const EnquerySchema = gql`
  ${EnqueryType}

  type Query {
    getEnquery(id: ID!): Enquery
    getAllEnquery(limit: Int, offset: Int, type: String): [Enquery!]
  }

  type Mutation {
    createEnquery(
      active: Boolean
      types: String!
      message: String!
      customerName: String
      email: String
      mobileNo: String
      fullAddress: String
      state: String
      productName: String
      sellerId: ID
    ): Enquery!

    updateEnquery(
      id: ID!
      active: Boolean
      message: String
      customerName: String
      email: String
      mobileNo: String
      fullAddress: String
      state: String
      productName: String
      sellerId: ID
    ): Enquery!

    deleteEnquery(id: ID!): Enquery!
  }
`;
