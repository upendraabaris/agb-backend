// src/graphql/resolvers/CouponCodeResolver.js
import authenticate from "../../middlewares/auth.js";
import CouponUsage from "../../models/CouponUsage.js";

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

  // Validate coupon for ad purchase
  validateAdCoupon: async (_, { code, userId, orderAmount }, { models }) => {
    try {
      // 1. Find coupon
      const coupon = await models.CouponCode.findOne({ couponCode: code });
      if (!coupon) {
        return { valid: false, message: 'Coupon code not found', discountAmount: 0, finalAmount: orderAmount, coupon: null };
      }

      // 2. Check active
      if (!coupon.active) {
        return { valid: false, message: 'This coupon is no longer active', discountAmount: 0, finalAmount: orderAmount, coupon: null };
      }

      // 3. Check couponType = 'ad'
      if (coupon.couponType !== 'ad') {
        return { valid: false, message: 'This coupon is not valid for advertisements', discountAmount: 0, finalAmount: orderAmount, coupon: null };
      }

      // 4. Check date range
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      if (coupon.start && todayStr < coupon.start) {
        return { valid: false, message: 'This coupon is not yet active', discountAmount: 0, finalAmount: orderAmount, coupon: null };
      }
      if (coupon.end && todayStr > coupon.end) {
        return { valid: false, message: 'This coupon has expired', discountAmount: 0, finalAmount: orderAmount, coupon: null };
      }

      // 5. Check minOrderAmount
      if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
        return { valid: false, message: `Minimum order amount is ₹${coupon.minOrderAmount}`, discountAmount: 0, finalAmount: orderAmount, coupon: null };
      }

      // 6. Check global usage limit
      if (coupon.maxUses !== null && coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) {
        return { valid: false, message: 'This coupon has reached its usage limit', discountAmount: 0, finalAmount: orderAmount, coupon: null };
      }

      // 7. Check per-user usage limit
      if (coupon.perUserLimit && userId) {
        const userUsageCount = await CouponUsage.countDocuments({ coupon_id: coupon._id, user_id: userId });
        if (userUsageCount >= coupon.perUserLimit) {
          return { valid: false, message: `You have already used this coupon ${userUsageCount} time(s)`, discountAmount: 0, finalAmount: orderAmount, coupon: null };
        }
      }

      // 8. Calculate discount
      let discountAmount = 0;
      if (coupon.discountType === 'flat') {
        discountAmount = Math.min(coupon.discount, orderAmount);
      } else {
        // percentage
        discountAmount = Math.round((coupon.discount / 100) * orderAmount);
      }
      discountAmount = Math.max(0, discountAmount);
      const finalAmount = Math.max(0, orderAmount - discountAmount);

      return {
        valid: true,
        message: `Coupon applied! You save ₹${discountAmount}`,
        discountAmount,
        finalAmount,
        coupon,
      };
    } catch (error) {
      throw new Error('Coupon validation failed: ' + error.message);
    }
  },
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
          couponType: args.couponType || 'product',
          discountType: args.discountType || 'percentage',
          maxUses: args.maxUses || null,
          usedCount: 0,
          perUserLimit: args.perUserLimit != null ? args.perUserLimit : 1,
          minOrderAmount: args.minOrderAmount || 0,
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
