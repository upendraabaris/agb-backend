// src/graphql/types/cartTypes.js

import { gql } from "apollo-server";

export const CartType = gql`
  type CartProduct {
    productId: Product!
    variantId: Variant!
    locationId: Location!
    sellerId:ID
    iprice: Float
    igst: Float
    idiscount: Int
    iextraChargeType: String
    iextraCharge: Float
    itransportChargeType: String
    itransportCharge: Float
    quantity: Int!
  }

  type Cart {
    id: ID!
    userId: User
    cartProducts: [CartProduct]
    createdAt: String!
    updatedAt: String!
  }

  type PayUTransactionResponse {
    success: Boolean!
    message: String
    redirectUrl: String
  }

  type PayUPaymentResponse {
    success: Boolean!
    message: String
  }
`;
