// src/graphql/types/siteFeaturesTypes.js
import { gql } from "apollo-server";

export const ProductClassType = gql`
  #graphql
  type ProductClass {
    id: ID!
    productClassName: String
    productClassDescription: String
    code: String
    listingCommission: Float
    listingType: String
    productCommission: Float
    productType: String
    fixedCommission: Float
    fixedType: String
    shippingCommission: Float
    shippingType: String
    specialStatus: Boolean
  }
  type Success{
    message: String
  }
`;
