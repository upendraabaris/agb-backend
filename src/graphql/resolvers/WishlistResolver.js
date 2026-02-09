// src/resolvers/WishlistResolver.js
import authenticate from "../../middlewares/auth.js";
import jwt from "jsonwebtoken";

export const Query = {
  wishlist: authenticate(["admin", "customer"])(
    async (_, __, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        return await models.Wishlist.findOne({ userId: user._id });
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  getAllWishlists: authenticate(["admin"])(
    async (_, { search, limit = 20, offset = 0 }, { models }) => {
      try {
        const query = {};
        if (search) {
          const regex = new RegExp("^" + search, "i");
          query.$or = [{ "cartProducts.productName": regex }];
        }

        const wishlists = await models.Wishlist.find(query)
          .populate("userId", "firstName mobileNo email") // 👈 ADD THIS
          .sort({ updatedAt: -1 })
          .limit(limit)
          .skip(offset)
          .lean();

        // 🔥 VERY IMPORTANT
        return wishlists.map((wishlist) => ({
          ...wishlist,
          id: wishlist._id.toString(),
        }));
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),
};

export const Mutation = {
  createWishlist: authenticate(["admin", "customer"])(
    async (_, { productId }, { models, req }) => {
      try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) throw new Error("Authorization token missing");

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        if (!user) throw new Error("User not found");

        let wishlist = await models.Wishlist.findOne({ userId: user._id });

        if (!wishlist) {
          wishlist = new models.Wishlist({
            userId: user._id,
            wishlistProducts: [],
          });
        }

        const alreadyExists = wishlist.wishlistProducts.some(
          (item) => item.productId.toString() === productId
        );

        if (alreadyExists) {
          // 👇 clear & meaningful error
          throw new Error("PRODUCT_ALREADY_IN_WISHLIST");
        }

        wishlist.wishlistProducts.push({ productId });
        await wishlist.save();

        return wishlist;
      } catch (error) {
        // 👇 actual error forward karo
        throw new Error(error.message || "Failed to add product to wishlist");
      }
    }
  ),

  removeFromWishlist: authenticate(["admin", "customer"])(
    async (_, { productId }, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const wishlist = await models.Wishlist.findOne({ userId: user._id });
        if (!wishlist) {
          throw new Error("Wishlist not found");
        }

        const wishlistProducts = wishlist.wishlistProducts || [];
        const ProductIndex = wishlistProducts.findIndex(
          (product) => product.productId.toString() === productId
        );

        if (ProductIndex === -1) {
          throw new Error("Product not found in wishlist");
        }

        wishlistProducts.splice(ProductIndex, 1);
        wishlist.wishlistProducts = wishlistProducts;
        await wishlist.save();

        return wishlist;
      } catch (error) {
        throw new Error("Failed to remove product from wishlist");
      }
    }
  ),
};
export const WishlistProduct = {
  productId: async (wishlistProducts, args, { models }) => {
    try {
      const carts = await models.Product.findById(wishlistProducts.productId);
      if (!carts) {
        const seriesProduct = await models.SeriesProduct.findById(
          wishlistProducts.productId
        );
        return seriesProduct;
      } else {
        return carts;
      }
    } catch (error) {
      throw new Error(error);
    }
  },
};
