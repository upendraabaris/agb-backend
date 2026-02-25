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
  }

  type RevenueReport {
    totalRevenue: Float!
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
  }

  type TierUtilization {
    tierId: ID!
    tierName: String!
    totalSlots: Int!
    occupiedSlots: Int!
    availableSlots: Int!
    utilizationPercentage: Float!
  }

  type SlotUtilizationReport {
    totalSlots: Int!
    occupiedSlots: Int!
    availableSlots: Int!
    utilizationPercentage: Float!
    tierBreakdown: [TierUtilization!]!
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
  }

  type AdvertiserSpendingReport {
    sellerId: ID!
    sellerName: String!
    sellerEmail: String
    totalSpent: Float!
    adCount: Int!
    activeAdsCount: Int!
    completedAdsCount: Int!
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
