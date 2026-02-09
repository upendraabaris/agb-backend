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
  }
`;
