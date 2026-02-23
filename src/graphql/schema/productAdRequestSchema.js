import { gql } from "apollo-server";

export const ProductAdRequestSchema = gql`
  type ProductAdRequest {
    id: ID!
    seller_id: ID!
    product_id: ID!
    tier_id: ID
    request_date: String
    status: String
    approved_by: ID
    approved_date: String
    rejection_reason: String
    createdAt: String
    updatedAt: String
  }

  type ProductAdRequestMedia {
    id: ID!
    product_ad_request_id: ID!
    slot: String!
    media_type: String
    mobile_image_url: String
    mobile_redirect_url: String
    desktop_image_url: String
    desktop_redirect_url: String
    createdAt: String
    updatedAt: String
  }

  type ProductAdRequestDuration {
    id: ID!
    product_ad_request_id: ID!
    slot: String!
    duration_days: Int
    start_date: String
    end_date: String
    status: String
    createdAt: String
    updatedAt: String
  }

  # For seller's "My Product Ads" dashboard
  type SellerProductAdInfo {
    id: ID!
    product_id: ID!
    productName: String
    brandName: String
    productThumbnail: String
    tier_id: ID!
    status: String!
    createdAt: String
    updatedAt: String
    medias: [SellerAdMedia!]!
    durations: [SellerAdDuration!]!
  }

  # For admin approval list
  type ProductAdApprovalRequest {
    id: ID!
    seller_id: ID!
    sellerName: String
    sellerEmail: String
    product_id: ID!
    productName: String
    brandName: String
    productThumbnail: String
    tier_id: ID!
    status: String!
    medias: [SellerAdMedia!]!
    durations: [SellerAdDuration!]!
    createdAt: String
    updatedAt: String
  }

  # For public display on product pages
  type ApprovedProductAd {
    id: ID!
    sellerName: String!
    sellerEmail: String!
    productId: ID!
    productName: String!
    brandName: String
    medias: [SellerAdMedia!]!
    durations: [SellerAdDuration!]!
    createdAt: String
  }

  # Slot availability for a product
  type ProductWithAdSlots {
    id: ID!
    productName: String!
    brandName: String
    thumbnail: String
    availableSlots: Int!
    bookedSlots: Int!
    bookedBanner: Int!
    bookedStamp: Int!
    slotStatuses: [SlotStatus!]!
  }

  type ProductApprovalResponse {
    success: Boolean!
    message: String
    data: ProductAdRequest
  }

  input CreateProductAdRequestInput {
    product_id: ID!
    duration_days: Int
    medias: [CategoryRequestMediaInput!]!
  }

  input ApproveProductAdRequestInput {
    requestId: ID!
    start_date: String!
  }

  input RejectProductAdRequestInput {
    requestId: ID!
    rejection_reason: String
  }

  extend type Query {
    # Seller queries (JWT-authenticated)
    getMyProductAds: [SellerProductAdInfo!]!

    # Admin queries (JWT-authenticated)
    getProductAdRequestsForApproval(status: String): [ProductAdApprovalRequest!]!

    # Public/display queries
    getProductsWithAvailableAdSlots: [ProductWithAdSlots!]!
    getApprovedAdsByProduct(productId: ID, productName: String): [ApprovedProductAd!]!
    getProductBannerAds: [ApprovedProductAd!]!
    getProductStampAds: [ApprovedProductAd!]!
  }

  extend type Mutation {
    createProductAdRequest(input: CreateProductAdRequestInput!): ProductAdRequest
    approveProductAdRequest(input: ApproveProductAdRequestInput!): ProductApprovalResponse!
    rejectProductAdRequest(input: RejectProductAdRequestInput!): ProductApprovalResponse!
  }
`;
