import { gql } from "apollo-server";
import { CategoryType } from "../types/categoryTypes.js";

export const CategorySchema = gql`
  ${CategoryType}

  type Query {
    getCategory(id: ID!): Category
    getCategoryByName(name: String!): Category
    getAllCategories(
      search: String
      limit: Int
      offset: Int
      sortBy: String
      sortOrder: String
    ): [Category!]
    
  }

  type Mutation {
    createCategory(
      name: String!
      file: Upload!
      description: String!
      parent: ID
      order: Int
    ): Category
    updateCategory(
      id: ID!
      name: String
      file: Upload
      description: String
      parent: ID
      image: String
      order: Int
    ): Category!
    deleteCategory(id: ID!): Category!
    updateCategory1(id: ID!, file: Upload, sliderImage: String): Category
  }
`;
