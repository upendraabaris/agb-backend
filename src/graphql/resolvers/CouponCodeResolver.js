// src/graphql/resolvers/ReviewResolver.js
import authenticate from "../../middlewares/auth.js";

export const Query = {
  getCouponCode: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      return await models.CouponCode.findById(id);
    } catch (error) {
      throw new Error(error);
    }
  }),
  // getCouponCodeByName: async (_, { code }, { models }) => {
  //   try {
  //     return await models.CouponCode.findOne({ couponCode: code });
  //   } catch (error) {
  //     throw new Error(error);
  //   }
  // },
  getCouponCodeByName: async (_, { code }, { models }) => {
    try {
      const coupon = await models.CouponCode.findOne({ couponCode: code });
      if (coupon && coupon.active) {
        return coupon;
      } else {
        return null; // or some other value
      }
    } catch (error) {
      throw new Error(error);
    }
  },
  getAllCouponCodes: authenticate(["admin"])(async (_, args, { models }) => {
    try {
      return await models.CouponCode.find();
    } catch (error) {
      throw new Error(error);
    }
  }),
};
export const Mutation = {
  createCouponCode: authenticate(["admin"])(
    async (_, args, { models, req }) => {
      try {
        const existingName = await models.CouponCode.findOne({
          couponName: args.couponName.trim(),
        });
        if (existingName) {
          throw new Error(
            "Coupon Name already exists. Please use a different name."
          );
        }
        const existingCode = await models.CouponCode.findOne({
          couponCode: args.couponCode.trim(),
        });
        if (existingCode) {
          throw new Error(
            "Coupon Code already exists. Please use a different code."
          );
        }
        const newReview = new models.CouponCode({
          couponName: args.couponName,
          discount: args.discount,
          couponCode: args.couponCode,
          start: args.start,
          end: args.end,
          active: args.active,
        });
        await newReview.save();
        return newReview;
      } catch (error) {
        throw new Error(error.message || "Something went wrong");
      }
    }
  ),
  deleteCouponCode: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      // await deleteChildren(id);
      const deletedReview = await models.CouponCode.findByIdAndRemove(id);
      return deletedReview;
    } catch (error) {
      throw new Error(error);
    }
  }),
};

export const CouponCode = {};
