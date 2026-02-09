import { gql } from "apollo-server";
import { WishlistType } from "../types/wishlistTypes.js";

export const WishlistSchema = gql`
  ${WishlistType}

  type Query {
    wishlist: Wishlist
    getAllWishlists(search: String, limit: Int, offset: Int): [Wishlist]
  }

  type Mutation {
    createWishlist(productId: ID!): Wishlist

    removeFromWishlist(productId: ID): Wishlist
  }
`;
