// src/graphql/types/cartsTypes.js

import { gql } from "apollo-server";

export const CartsType = gql`
  type CartProducts {
    productId: Product!
    variantId: Variant!
    locationId: Location!
    quantity: Int!
    sellerId: ID
  }

  type Carts {
    id: ID!
    userId: User
    cartProducts: [CartProducts]
    createdAt: String!
    updatedAt: String!
  }
`;
