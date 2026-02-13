import { gql } from "apollo-server";

export const AdTierProductCategoryMappingSchema = gql`
  type AdTierProductCategoryMapping {
    id: ID!
    ad_tier_id: AdTierMaster
    category_ids: [Category]
    createdAt: String
    updatedAt: String
  }

  input AdTierProductCategoryMappingInput {
    ad_tier_id: ID!
    category_ids: [ID!]!
  }

  extend type Query {
    adTierProductCategoryMappings: [AdTierProductCategoryMapping]
    getAdTierProductCategoryMapping(id: ID!): AdTierProductCategoryMapping
    getTiersByCategory(categoryId: ID!): [AdTierMaster]
  }

  extend type Mutation {
    createAdTierProductCategoryMapping(input: AdTierProductCategoryMappingInput!): AdTierProductCategoryMapping
    updateAdTierProductCategoryMapping(id: ID!, input: AdTierProductCategoryMappingInput!): AdTierProductCategoryMapping
    deleteAdTierProductCategoryMapping(id: ID!): DeleteResponse
  }
`;
