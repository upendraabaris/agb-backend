import { gql } from "apollo-server";
import { AdCategoryType } from "../types/adCategoryTypes.js";

export const AdCategorySchema = gql`
    ${AdCategoryType}
    type Query {
      adCategories: [AdCategory]
      allAdCategories: [AdCategory]
      getAdCategory(id: ID!): AdCategory
      getAdCategoryByName(name: String!): AdCategory
    }

    type Mutation {
      createAdCategory(input: AdCategoryInput!): AdCategory
      updateAdCategory(id: ID!, input: AdCategoryInput!): AdCategory
      deleteAdCategory(id: ID!): DeleteResponse
      toggleAdCategoryStatus(id: ID!): AdCategory
    }
`;
