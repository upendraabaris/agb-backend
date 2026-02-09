// src/graphql/types/reviewTypes.js

import { gql } from "apollo-server";

export const ReviewType = gql`
  type Review {
    id: ID!
    user: User!
    productId: ID!
    sellerId: ID
    orderId: ID
    images: [String]
    rating: Int!
    title: String
    description: String
    repliesSeller: String
    repliesSellerDate: String
    repliesAdmin: String
    repliesAdminDate: String
    createdAt: String    
  }
`;
