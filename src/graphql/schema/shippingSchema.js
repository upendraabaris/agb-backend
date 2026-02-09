import { gql } from "apollo-server";
import { ShippingType } from "../types/shippingTypes.js";

export const ShippingSchema = gql`
  ${ShippingType}

  type Query {
    getShipping(id: ID!): Shipping
    getAllShipping: [Shipping!]
  }

  type Mutation {
    createShipping(
      shipping_company: String!
      url: String!
      description: String!
      api: String!
    ): Shipping!
    updateShipping(
      id: ID!
      shipping_company: String
      url: String
      description: String
      api: String
    ): Shipping!
    deleteShipping(id: ID!): Shipping!
  }
`;
