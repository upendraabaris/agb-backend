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
    desktop_image_url: String
    redirect_url: String
    url_type: String
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
    start: String
    end: String
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
    redirect_url: String
    url_type: String
  }

  type SellerAdDuration {
    id: ID!
    slot: String!
    duration_days: Int
    start_date: String
    end_date: String
    status: String
    start_preference: String
    quarters_covered: [String]
    pricing_breakdown: [PricingBreakdown]
    total_price: Float
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

  type SlotAvailabilityDetail {
    slot: String!
    startDate: String
    endDate: String
    conflict: Boolean!
    conflictId: ID
  }

  type SlotAvailability {
    available: Boolean!
    details: [SlotAvailabilityDetail!]!
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

  # Per-slot availability within a specific quarter
  type QuarterSlotStatus {
    slot: String!
    available: Boolean!
  }

  # Quarter-level availability for a category
  type QuarterAvailability {
    quarter: String!       # "Q2 2026"
    label: String!         # "Apr - Jun 2026"
    startDate: String!
    endDate: String!
    slots: [QuarterSlotStatus!]!
  }

  type CategoryWithSlots {
    id: ID!
    name: String!
    image: String
    description: String
    order: Int
    adTierId: ID
    parent: ID
    availableSlots: Int!
    bookedSlots: Int!
    bookedBanner: Int
    bookedStamp: Int
    slotStatuses: [SlotStatus!]
    tierId: CategoryTier
    # price entries specifically for quarterly duration; helps frontend show default cost
    pricing90: [AdCategoryPricing!]
    # Next 4 quarters with per-slot availability
    quarterAvailability: [QuarterAvailability!]
  }

  type AdCategoryPricing {
    id: ID!
    ad_type: String!
    slot_name: String!
    slot_position: Int!
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
    desktop_image_url: String
    redirect_url: String
    url_type: String
  }

  input CreateCategoryRequestInput {
    category_id: ID!
    duration_days: Int
    duration_type: String          # "quarterly" | "half_yearly" | "yearly"
    start_preference: String       # "today" | "select_quarter"
    start_quarter: String          # ISO date of quarter start, e.g. "2026-04-01"
    medias: [CategoryRequestMediaInput!]!
  }

  input ApproveAdRequestInput {
    requestId: ID!
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
    checkSlotAvailability(requestId: ID!, start_date: String!): SlotAvailability!
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

