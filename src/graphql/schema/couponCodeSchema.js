import { gql } from "apollo-server";
import { CouponCodeType } from "../types/couponCodeTypes.js";

export const CouponCodeSchema = gql`
  ${CouponCodeType}

  type Query {
    getCouponCode(id: ID!): CouponCode
    getAllCouponCodes: [CouponCode!]
    getCouponCodeByName(code: String): CouponCode
  }

  type Mutation {
    createCouponCode(couponName: String, start: String, active: Boolean, end: String, discount: Float, couponCode: String): CouponCode

    deleteCouponCode(id: ID!): CouponCode
  }
`;
