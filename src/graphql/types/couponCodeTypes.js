// src/graphql/types/couponCodeTypes.js

import { gql } from "apollo-server";

export const CouponCodeType = gql`
  type CouponCode {
    id: ID!
    couponName: String
    discount: Float
    couponCode: String
    start: String
    end: String
    active: Boolean
    couponType: String
    discountType: String
    maxUses: Int
    usedCount: Int
    perUserLimit: Int
    minOrderAmount: Float
  }

  type CouponValidationResult {
    valid: Boolean!
    message: String!
    discountAmount: Float
    finalAmount: Float
    coupon: CouponCode
  }
`;
