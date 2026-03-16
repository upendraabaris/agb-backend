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
  # PRODUCT AD REPORTING TYPES
  # ==========================================

  type ProductAdRevenueBreakdown {
    tierName: String!
    tierId: ID!
    revenue: Float!
    adCount: Int!
    bannerCount: Int!
    stampCount: Int!
    couponDiscount: Float!
    netRevenue: Float!
  }

  type ProductAdRevenueReport {
    totalRevenue: Float!
    totalCouponDiscount: Float!
    totalNetRevenue: Float!
    period: String!
    year: Int!
    month: Int
    quarter: Int
    breakdown: [ProductAdRevenueBreakdown!]!
  }

  type ProductAdTierSalesReport {
    tierId: ID!
    tierName: String!
    totalAdsSold: Int!
    bannerCount: Int!
    stampCount: Int!
    revenue: Float!
    couponDiscount: Float!
    netRevenue: Float!
  }

  type ProductAdPendingApprovalItem {
    id: ID!
    sellerId: ID!
    sellerName: String!
    sellerEmail: String
    productId: ID!
    productName: String!
    tierId: ID!
    tierName: String!
    requestDate: String!
  }

  type ProductAdPendingApprovalsReport {
    count: Int!
    requests: [ProductAdPendingApprovalItem!]!
  }

  type ProductAdExpiryItem {
    id: ID!
    productAdRequestId: ID!
    sellerId: ID!
    sellerName: String!
    sellerEmail: String
    productId: ID!
    productName: String!
    tierId: ID!
    tierName: String!
    slot: String!
    startDate: String!
    endDate: String!
    remainingDays: Int!
    totalPrice: Float
    couponCode: String
    couponDiscountAmount: Float
    finalPrice: Float
  }

  type ProductAdAdvertiserSpendingReport {
    sellerId: ID!
    sellerName: String!
    sellerEmail: String
    totalSpent: Float!
    adCount: Int!
    activeAdsCount: Int!
    completedAdsCount: Int!
    totalCouponDiscount: Float!
  }

  type SellerActiveProductAdMedia {
    slot: String!
    mobileImageUrl: String
    desktopImageUrl: String
    redirectUrl: String
  }

  type SellerActiveProductAd {
    id: ID!
    productAdRequestId: ID!
    productId: ID!
    productName: String!
    tierId: ID!
    tierName: String!
    slot: String!
    status: String!
    startDate: String!
    endDate: String!
    remainingDays: Int!
    durationDays: Int!
    totalPrice: Float
    couponCode: String
    couponDiscountAmount: Float
    finalPrice: Float
    media: SellerActiveProductAdMedia
  }

  type SellerPastProductAd {
    id: ID!
    productAdRequestId: ID!
    productId: ID!
    productName: String!
    tierId: ID!
    tierName: String!
    slot: String!
    status: String!
    startDate: String
    endDate: String
    durationDays: Int!
    completedDate: String
    totalPrice: Float
    couponCode: String
    couponDiscountAmount: Float
    finalPrice: Float
  }

  type ProductAdValidityInfo {
    adId: ID!
    productAdRequestId: ID!
    productName: String!
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
    # Admin Category Ad Reporting Queries
    getAdminRevenueReport(
      period: String!
      year: Int!
      quarter: Int
      half: Int
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

    # Advertiser Category Ad Reporting Queries (authenticated)
    getMyActiveAds: [AdvertiserActiveAd!]!
    getMyPastAds: [AdvertiserPastAd!]!
    getMyAdValidity: [AdValidityInfo!]!

    # Admin Product Ad Reporting Queries
    getAdminProductAdRevenueReport(
      period: String!
      year: Int!
      quarter: Int
      half: Int
    ): ProductAdRevenueReport!

    getAdminProductAdTierSalesReport(
      startDate: String
      endDate: String
    ): [ProductAdTierSalesReport!]!

    getAdminProductAdPendingApprovals: ProductAdPendingApprovalsReport!

    getAdminProductAdExpiryUpcoming(days: Int!): [ProductAdExpiryItem!]!

    getAdminProductAdAdvertiserSpending(
      startDate: String
      endDate: String
    ): [ProductAdAdvertiserSpendingReport!]!

    # Seller Product Ad Reporting Queries (authenticated)
    getMyActiveProductAds: [SellerActiveProductAd!]!
    getMyPastProductAds: [SellerPastProductAd!]!
    getMyProductAdValidity: [ProductAdValidityInfo!]!
  }
`;
