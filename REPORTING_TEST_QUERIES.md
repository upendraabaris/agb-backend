# Advertisement Reporting Module - Test Queries

This document contains sample GraphQL queries to test all reporting functionality.

## Server Information
- **GraphQL Endpoint**: http://localhost:4000/api/graphql
- **Status**: ✅ Server running successfully

---

## Admin Reporting Queries

### 1. Revenue Report (Monthly)

```graphql
query GetMonthlyRevenue {
  getAdminRevenueReport(period: "monthly", year: 2026, month: 2) {
    totalRevenue
    period
    year
    month
    breakdown {
      tierName
      tierId
      revenue
      adCount
    }
  }
}
```

### 2. Revenue Report (Quarterly)

```graphql
query GetQuarterlyRevenue {
  getAdminRevenueReport(period: "quarterly", year: 2026, quarter: 1) {
    totalRevenue
    period
    year
    quarter
    breakdown {
      tierName
      tierId
      revenue
      adCount
    }
  }
}
```

### 3. Revenue Report (Annual)

```graphql
query GetAnnualRevenue {
  getAdminRevenueReport(period: "annual", year: 2026) {
    totalRevenue
    period
    year
    breakdown {
      tierName
      tierId
      revenue
      adCount
    }
  }
}
```

### 4. Tier Sales Report

```graphql
query GetTierSales {
  getAdminTierSalesReport {
    tierId
    tierName
    totalAdsSold
    bannerCount
    stampCount
    revenue
  }
}
```

**With Date Filtering:**
```graphql
query GetTierSalesFiltered {
  getAdminTierSalesReport(
    startDate: "2026-01-01"
    endDate: "2026-02-28"
  ) {
    tierId
    tierName
    totalAdsSold
    bannerCount
    stampCount
    revenue
  }
}
```

### 5. Slot Utilization Report

```graphql
query GetSlotUtilization {
  getAdminSlotUtilization {
    totalSlots
    occupiedSlots
    availableSlots
    utilizationPercentage
    tierBreakdown {
      tierId
      tierName
      totalSlots
      occupiedSlots
      availableSlots
      utilizationPercentage
    }
  }
}
```

### 6. Pending Approvals

```graphql
query GetPendingApprovals {
  getAdminPendingApprovals {
    count
    requests {
      id
      sellerId
      sellerName
      sellerEmail
      categoryId
      categoryName
      tierId
      tierName
      requestDate
      slotsRequested
    }
  }
}
```

### 7. Expiry Upcoming (Next 7 Days)

```graphql
query GetExpiringAds {
  getAdminExpiryUpcoming(days: 7) {
    id
    categoryRequestId
    sellerId
    sellerName
    sellerEmail
    categoryId
    categoryName
    tierId
    tierName
    slot
    startDate
    endDate
    remainingDays
  }
}
```

**Next 30 Days:**
```graphql
query GetExpiringAds30Days {
  getAdminExpiryUpcoming(days: 30) {
    id
    sellerName
    categoryName
    tierName
    slot
    endDate
    remainingDays
  }
}
```

### 8. Advertiser Spending Report

```graphql
query GetAdvertiserSpending {
  getAdminAdvertiserSpending {
    sellerId
    sellerName
    sellerEmail
    totalSpent
    adCount
    activeAdsCount
    completedAdsCount
  }
}
```

**With Date Filtering:**
```graphql
query GetAdvertiserSpendingFiltered {
  getAdminAdvertiserSpending(
    startDate: "2026-01-01"
    endDate: "2026-02-28"
  ) {
    sellerId
    sellerName
    totalSpent
    adCount
    activeAdsCount
    completedAdsCount
  }
}
```

---

## Advertiser Reporting Queries

> **Note**: These queries require authentication. Add the following HTTP header:
> ```json
> {
>   "authorization": "Bearer YOUR_SELLER_JWT_TOKEN"
> }
> ```

### 9. My Active Ads

```graphql
query GetMyActiveAds {
  getMyActiveAds {
    id
    categoryRequestId
    categoryId
    categoryName
    tierId
    tierName
    slot
    status
    startDate
    endDate
    remainingDays
    durationDays
    media {
      slot
      mobileImageUrl
      desktopImageUrl
      mobileRedirectUrl
      desktopRedirectUrl
    }
  }
}
```

### 10. My Past Ads

```graphql
query GetMyPastAds {
  getMyPastAds {
    id
    categoryRequestId
    categoryId
    categoryName
    tierId
    tierName
    slot
    status
    startDate
    endDate
    durationDays
    completedDate
  }
}
```

### 11. My Ad Validity

```graphql
query GetMyAdValidity {
  getMyAdValidity {
    adId
    categoryRequestId
    categoryName
    slot
    endDate
    remainingDays
    status
    isExpiringSoon
  }
}
```

---

## Testing Checklist

### Admin Queries (No Authentication Required)
- [ ] Test monthly revenue report
- [ ] Test quarterly revenue report
- [ ] Test annual revenue report
- [ ] Test tier sales report (with and without date filters)
- [ ] Test slot utilization report
- [ ] Test pending approvals count
- [ ] Test expiry upcoming (7 days and 30 days)
- [ ] Test advertiser spending report (with and without date filters)

### Advertiser Queries (Requires Seller JWT Token)
- [ ] Test getMyActiveAds with valid seller token
- [ ] Test getMyPastAds with valid seller token
- [ ] Test getMyAdValidity with valid seller token
- [ ] Verify authentication error with invalid/missing token

---

## Expected Results

### Revenue Report
- Should return total revenue and breakdown by tier
- Revenue calculated from AdCategory pricing
- Only includes approved/running ads
- Date filtering works correctly

### Tier Sales Report
- Groups ads by tier
- Counts banner vs stamp ads separately
- Calculates revenue per tier
- Optional date filtering

### Slot Utilization
- Shows 8 slots per tier (banner_1-4, stamp_1-4)
- Calculates utilization percentage
- Provides per-tier breakdown

### Pending Approvals
- Lists all requests with status='pending'
- Includes seller and category information
- Shows number of slots requested

### Expiry Upcoming
- Lists ads expiring within specified days
- Sorted by expiry date (soonest first)
- Shows remaining days countdown

### Advertiser Spending
- Groups by seller
- Shows total spending and ad counts
- Separates active vs completed ads
- Sorted by spending (highest first)

### My Active Ads
- Shows only current seller's running ads
- Includes media URLs and redirect links
- Shows remaining days for each ad
- Sorted by remaining days (expiring soonest first)

### My Past Ads
- Shows completed/rejected ads
- Includes completion date
- Sorted by most recent first

### My Ad Validity
- Shows remaining days for all active ads
- Flags ads expiring within 7 days
- Sorted by remaining days

---

## Troubleshooting

### Common Issues

1. **"Authorization header missing"**
   - Add Bearer token in HTTP headers for advertiser queries

2. **"Month is required for monthly reports"**
   - Include month parameter when period="monthly"

3. **"Quarter is required for quarterly reports"**
   - Include quarter parameter (1-4) when period="quarterly"

4. **Empty results**
   - Check if there's data in the database
   - Verify date ranges are correct
   - Ensure ads have proper status values

5. **Revenue is 0**
   - Check if AdCategory has pricing configured
   - Verify tier mappings are correct
