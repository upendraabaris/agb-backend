import { gql } from "apollo-server";
import { ReviewType } from "../types/reviewTypes.js";

export const ReviewSchema = gql`
  ${ReviewType}

  type Query {
    getReview(id: ID!): Review
    getReviewByOrderId(id: ID!): [Review]
    getAllReviews: [Review!]
    getReviewByProduct(productId: ID): [Review]
    getReviewsBySeller: [Review!]
  }

  type Mutation {
    createReview(
      productId: ID!
      sellerId: ID
      orderId: ID
      rating: Int!
      title: String
      description: String
      repliesSeller: String
      repliesSellerDate: String
      repliesAdmin: String
      repliesAdminDate: String
      reviewImages: [Upload]
    ): Review

    updateReviewReply(
      id: ID!
      repliesSeller: String
      repliesSellerDate: String
      repliesAdmin: String
      repliesAdminDate: String
    ): Review

    deleteReview(id: ID!): Review
  }
`;
