// src/graphql/types/wishlistTypes.js

import { gql } from "apollo-server";

export const WishlistType = gql`
  type WishlistProduct {
    productId: Product!
  }

  type Wishlist {
    id: ID!
    userId: User
    wishlistProducts: [WishlistProduct]
    createdAt: String!
    updatedAt: String!
  }
`;
