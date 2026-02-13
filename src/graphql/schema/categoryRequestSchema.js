import { gql } from "apollo-server";

export const CategoryRequestSchema = gql`
  type CategoryRequest {
    id: ID!
    seller_id: ID!
    category_id: ID!
    tier_id: ID
    request_date: String
    status: String
    createdAt: String
    updatedAt: String
  }

  type CategoryRequestMedia {
    id: ID!
    category_request_id: ID!
    slot: String!
    media_type: String
    mobile_image_url: String
    mobile_redirect_url: String
    desktop_image_url: String
    desktop_redirect_url: String
    createdAt: String
    updatedAt: String
  }

  type CategoryRequestDuration {
    id: ID!
    category_request_id: ID!
    slot: String!
    duration_days: Int
    start_date: String
    end_date: String
    status: String
    createdAt: String
    updatedAt: String
  }

  type SellerAdMedia {
    id: ID!
    slot: String!
    media_type: String
    mobile_image_url: String
    desktop_image_url: String
    mobile_redirect_url: String
    desktop_redirect_url: String
  }

  type SellerAdDuration {
    id: ID!
    slot: String!
    duration_days: Int
    start_date: String
    end_date: String
    status: String
  }

  type SellerAdInfo {
    id: ID!
    category_id: ID!
    categoryName: String
    tier_id: ID!
    status: String!
    createdAt: String
    updatedAt: String
    medias: [SellerAdMedia!]!
    durations: [SellerAdDuration!]!
  }

  type CategoryTier {
    id: ID!
    name: String!
  }

  type CategoryWithSlots {
    id: ID!
    name: String!
    image: String
    description: String
    order: Int
    adTierId: ID
    availableSlots: Int!
    bookedSlots: Int!
    tierId: CategoryTier
  }

  type AdCategoryPricing {
    id: ID!
    ad_type: String!
    price: Int!
    priority: Int
    duration_days: Int!
  }

  type CategoryPricingInfo {
    categoryId: ID!
    tierId: ID!
    tierName: String!
    adCategories: [AdCategoryPricing!]!
  }

  input CategoryRequestMediaInput {
    slot: String!
    media_type: String
    mobile_image_url: String
    mobile_redirect_url: String
    desktop_image_url: String
    desktop_redirect_url: String
  }

  input CreateCategoryRequestInput {
    category_id: ID!
    duration_days: Int
    medias: [CategoryRequestMediaInput!]!
  }

  extend type Query {
    getMyAds: [SellerAdInfo!]!
    getCategoryRequestsBySeller(sellerId: ID!): [CategoryRequest]
    getCategoryRequests: [CategoryRequest]
    getCategoryRequestDurations(requestId: ID!): [CategoryRequestDuration]
    getCategoriesWithAvailableSlots: [CategoryWithSlots!]!
    getCategoryPricing(categoryId: ID!): CategoryPricingInfo
  }

  extend type Mutation {
    createCategoryRequest(input: CreateCategoryRequestInput!): CategoryRequest
    approveCategoryRequest(id: ID!, slot: String!, start_date: String!, end_date: String!, duration_days: Int): CategoryRequestDuration
    rejectCategoryRequest(id: ID!): CategoryRequest
  }
`;
