import { gql } from "apollo-server";

export const CategoryRequestSchema = gql`
  type CategoryRequest {
    id: ID!
    seller_id: ID!
    category_id: ID!
    tier_id: ID
    request_date: String
    status: String
    approved_by: ID
    approved_date: String
    rejection_reason: String
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
    start_preference: String
    quarters_covered: [String]
    pricing_breakdown: [PricingBreakdown]
    total_price: Float
    createdAt: String
    updatedAt: String
  }

  type PricingBreakdown {
    quarter: String
    days: Int
    rate_per_day: Float
    subtotal: Float
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

  type SellerInfo {
    id: ID!
    name: String
    email: String
  }

  type AdApprovalRequest {
    id: ID!
    seller_id: ID!
    sellerName: String
    sellerEmail: String
    category_id: ID!
    categoryName: String
    tier_id: ID!
    status: String!
    medias: [SellerAdMedia!]!
    durations: [SellerAdDuration!]!
    createdAt: String
    updatedAt: String
  }

  type ApprovalResponse {
    success: Boolean!
    message: String
    data: CategoryRequest
  }

  type CategoryTier {
    id: ID!
    name: String!
  }

  type SlotStatus {
    slot: String!        # "banner_1", "banner_2", etc.
    available: Boolean!  # true when the slot can be booked now
    freeDate: String     # if the slot is currently booked this is when it becomes free (ISO)
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
    bookedBanner: Int
    bookedStamp: Int
    slotStatuses: [SlotStatus!]
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

  type ApprovedAd {
    id: ID!
    sellerName: String!
    sellerEmail: String!
    categoryId: ID!
    categoryName: String!
    medias: [SellerAdMedia!]!
    durations: [SellerAdDuration!]!
    createdAt: String
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
    start_preference: String
    medias: [CategoryRequestMediaInput!]!
  }

  input ApproveAdRequestInput {
    requestId: ID!
    start_date: String!
  }

  input RejectAdRequestInput {
    requestId: ID!
    rejection_reason: String
  }

  extend type Query {
    getMyAds: [SellerAdInfo!]!
    getCategoryRequestsBySeller(sellerId: ID!): [CategoryRequest]
    getCategoryRequests: [CategoryRequest]
    getCategoryRequestDurations(requestId: ID!): [CategoryRequestDuration]
    getCategoriesWithAvailableSlots: [CategoryWithSlots!]!
    getCategoryPricing(categoryId: ID!): CategoryPricingInfo
    getAdRequestsForApproval(status: String): [AdApprovalRequest!]!
    getApprovedAdsByCategory(categoryId: ID, categoryName: String): [ApprovedAd!]!
    getBannerAds: [ApprovedAd!]!
    getStampAds: [ApprovedAd!]!
  }

  extend type Mutation {
    createCategoryRequest(input: CreateCategoryRequestInput!): CategoryRequest
    approveCategoryRequest(id: ID!, slot: String!, start_date: String!, end_date: String!, duration_days: Int): CategoryRequestDuration
    rejectCategoryRequest(id: ID!): CategoryRequest
    approveAdRequest(input: ApproveAdRequestInput!): ApprovalResponse!
    rejectAdRequest(input: RejectAdRequestInput!): ApprovalResponse!
  }
`;

