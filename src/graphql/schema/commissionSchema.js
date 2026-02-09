import { gql } from "apollo-server";
import { CommissionType } from "../types/commissionTypes.js";

export const CommissionSchema = gql`
  ${CommissionType}

  type Query {
    getAllCommissions(
      productType: String
      listingCommType: String
      listingComm: Float
      productCommType: String
      productComm: Float
      shippingCommType: String
      shippingComm: Float
      fixedCommType: String
      fixedComm: Float
    ): [Commission!]
  }

  type Mutation {
    createCommission(
      productType: String
      listingCommType: String
      listingComm: Float
      productCommType: String
      productComm: Float
      shippingCommType: String
      shippingComm: Float
      fixedCommType: String
      fixedComm: Float
    ): Commission
    updateCommission(
      id: ID!
      productType: String
      listingCommType: String
      listingComm: Float
      productCommType: String
      productComm: Float
      shippingCommType: String
      shippingComm: Float
      fixedCommType: String
      fixedComm: Float
    ): Commission!
    deleteCommission(id: ID!): Commission!
  }
`;
