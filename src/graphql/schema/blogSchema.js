import { gql } from "apollo-server";
import { BlogType } from "../types/blogTypes.js";

export const BlogSchema = gql`
  ${BlogType}

  type Query {
    getBlog(id: ID!): Blog
    getAllBlog(
      search: String
      limit: Int
      offset: Int
      sortBy: String
      sortOrder: String
    ): [Blog!]
  }

  type Mutation {
    createBlog(
      title: String!
      files: [Upload]!
      content: String!
      tags: String!
    ): Blog!
    updateBlog(
      id: ID!
      title: String
      files: [Upload]
      content: String
      tags: String
    ): Blog!
    deleteBlog(id: ID!): Blog!
  }
`;
