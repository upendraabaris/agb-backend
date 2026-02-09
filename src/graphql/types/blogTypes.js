// src/graphql/types/blogTypes.js

import { gql } from "apollo-server";

export const BlogType = gql`
  type Blog {
    id: ID!
    title: String!
    image: [String]
    content: String!
    tags: String!
    createdAt: String
  }
`;
