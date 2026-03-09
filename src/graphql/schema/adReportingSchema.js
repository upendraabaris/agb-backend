import { gql } from "apollo-server";

export const AdReportingSchema = gql`
  # ==========================================
  # ADMIN REPORTING TYPES
  # ==========================================

  type RevenueBreakdown {
    tierName: String!
    tierId: ID!
    revenue: Float!
    adCount: Int!
    bannerCount: Int!
    stampCount: Int!
    couponDiscount: Float!
    netRevenue: Float!
  }

  type RevenueReport {
    totalRevenue: Float!
    totalCouponDiscount: Float!
    totalNetRevenue: Float!
    period: String!
    year: Int!
    month: Int
    quarter: Int
    breakdown: [RevenueBreakdown!]!
  }

  type TierSalesReport {
    tierId: ID!
    tierName: String!
    totalAdsSold: Int!
    bannerCount: Int!
    stampCount: Int!
    revenue: Float!
    couponDiscount: Float!
    netRevenue: Float!
  }

  type TierUtilization {
    tierId: ID!
    tierName: String!
    totalSlots: Int!
    occupiedSlots: Int!
    availableSlots: Int!
    utilizationPercentage: Float!
  }

  type QuarterSlotDetail {
    quarter: String!
    slot: String!
    sellerName: String
    categoryName: String
    tierName: String
    status: String
    startDate: String
    endDate: String
  }

  type SlotUtilizationReport {
    totalSlots: Int!
    occupiedSlots: Int!
    availableSlots: Int!
    utilizationPercentage: Float!
    tierBreakdown: [TierUtilization!]!
    quarterSlotDetails: [QuarterSlotDetail!]!
  }

  type PendingApprovalItem {
    id: ID!
    sellerId: ID!
    sellerName: String!
    sellerEmail: String
    categoryId: ID!
    categoryName: String!
    tierId: ID!
    tierName: String!
    requestDate: String!
    slotsRequested: Int!
  }

  type PendingApprovalsReport {
    count: Int!
    requests: [PendingApprovalItem!]!
  }

  type ExpiryUpcomingItem {
    id: ID!
    categoryRequestId: ID!
    sellerId: ID!
    sellerName: String!
    sellerEmail: String
    categoryId: ID!
    categoryName: String!
    tierId: ID!
    tierName: String!
    slot: String!
    startDate: String!
    endDate: String!
    remainingDays: Int!
    quartersCovered: [String]
    totalPrice: Float
    couponCode: String
    couponDiscountAmount: Float
    finalPrice: Float
  }

  type AdvertiserSpendingReport {
    sellerId: ID!
    sellerName: String!
    sellerEmail: String
    totalSpent: Float!
    adCount: Int!
    activeAdsCount: Int!
    completedAdsCount: Int!
    totalCouponDiscount: Float!
  }

  # ==========================================
  # ADVERTISER REPORTING TYPES
  # ==========================================

  type AdvertiserActiveAdMedia {
    slot: String!
    mobileImageUrl: String
    desktopImageUrl: String
    redirectUrl: String
  }

  type AdvertiserActiveAd {
    id: ID!
    categoryRequestId: ID!
    categoryId: ID!
    categoryName: String!
    tierId: ID!
    tierName: String!
    slot: String!
    status: String!
    startDate: String!
    endDate: String!
    remainingDays: Int!
    durationDays: Int!
    quartersCovered: [String]
    totalPrice: Float
    couponCode: String
    couponDiscountAmount: Float
    finalPrice: Float
    media: AdvertiserActiveAdMedia
  }

  type AdvertiserPastAd {
    id: ID!
    categoryRequestId: ID!
    categoryId: ID!
    categoryName: String!
    tierId: ID!
    tierName: String!
    slot: String!
    status: String!
    startDate: String
    endDate: String
    durationDays: Int!
    completedDate: String
    quartersCovered: [String]
    totalPrice: Float
    couponCode: String
    couponDiscountAmount: Float
    finalPrice: Float
  }

  type AdValidityInfo {
    adId: ID!
    categoryRequestId: ID!
    categoryName: String!
    slot: String!
    endDate: String!
    remainingDays: Int!
    status: String!
    isExpiringSoon: Boolean!
    quartersCovered: [String]
  }

  # ==========================================
  # QUERIES
  # ==========================================

  extend type Query {
    # Admin Reporting Queries
    getAdminRevenueReport(
      period: String!
      year: Int!
      month: Int
      quarter: Int
    ): RevenueReport!

    getAdminTierSalesReport(
      startDate: String
      endDate: String
    ): [TierSalesReport!]!

    getAdminSlotUtilization: SlotUtilizationReport!

    getAdminPendingApprovals: PendingApprovalsReport!

    getAdminExpiryUpcoming(days: Int!): [ExpiryUpcomingItem!]!

    getAdminAdvertiserSpending(
      startDate: String
      endDate: String
    ): [AdvertiserSpendingReport!]!

    # Advertiser Reporting Queries (authenticated)
    getMyActiveAds: [AdvertiserActiveAd!]!
    getMyPastAds: [AdvertiserPastAd!]!
    getMyAdValidity: [AdValidityInfo!]!
  }
`;
