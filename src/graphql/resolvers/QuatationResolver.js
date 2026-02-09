// src/graphql/resolvers/QuatationResolver.js
import authenticate from "../../middlewares/auth.js";
import jwt from "jsonwebtoken";

export const Query = {
  singlequatation: authenticate(["admin", "seller"])(
    async (_, { id }, { models, req }) => {
      return await models.Quatation.findById(id);
    }
  ),

  quatation: authenticate(["admin", "seller"])(
    async (_, __, { models, req }) => {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await models.User.findById(decoded._id);
      return await models.Quatation.find({ sellerId: user.seller });
    }
  ),
};

export const Mutation = {
  createQuatation: authenticate(["admin", "seller"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const quatation = new models.Quatation({
          customerName: args.customerName,
          customerAddress: args.customerAddress,
          customerGSTIN: args.customerGSTIN,
          customerBusinessName: args.customerBusinessName,
          customerMobile: args.customerMobile,
          quatationProducts: args.quatationProducts,
          sellerId: user.seller,
        });
        await quatation.save();
        return quatation;
      } catch (error) {
        console.error(error);
        throw new Error("Failed to add product to cart");
      }
    }
  ),

  updateQuatation: authenticate(["admin", "seller"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);

        const updateFields = {
          quatationProducts: args.quatationProducts,
          customerName: args.customerName,
          customerGSTIN: args.customerGSTIN,
          customerBusinessName: args.customerBusinessName,
          customerMobile: args.customerMobile,
          customerAddress: args.customerAddress,
        };

        const updateQuatation = await models.Quatation.findByIdAndUpdate(
          args.id,
          updateFields,
          { new: true }
        );
        return updateQuatation;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  deleteQuatation: authenticate(["admin", "seller", "customer"])(
    async (_, args, { models }) => {
      try {
        const quatation = await models.Quatation.findByIdAndRemove(args.id);
        return quatation;
      } catch (error) {
        console.error(error);
        throw new Error("Failed to remove product from cart");
      }
    }
  ),
};

export const QuatationProducts = {
  productId: async (quatationProducts, _, { models }) => {
    try {
      const product = await models.Product.findById(
        quatationProducts.productId
      );
      if (!product) {
        const seriesProduct = await models.SeriesProduct.findById(
          quatationProducts.productId
        );
        if (!seriesProduct) {
          const tmtseriesProduct = await models.TMTSeriesProduct.findById(
            quatationProducts.productId
          );
          return tmtseriesProduct;
        } else {
          return seriesProduct;
        }
      } else {
        return product;
      }
    } catch (error) {
      console.error(error);

      throw new Error("Failed to fetch product");
    }
  },
  variantId: async (quatationProducts, _, { models }) => {
    try {
      const product = await models.Product.findById(
        quatationProducts.productId
      );
      if (!product) {
        const seriesProduct = await models.SeriesProduct.findById(
          quatationProducts.productId
        );
        if (!seriesProduct) {
          const tmtseriesProduct = await models.TMTSeriesProduct.findById(
            quatationProducts.productId
          );
          const tmtseriesvariant = tmtseriesProduct.tmtseriesvariant.find(
            (obj) =>
              obj._id.toString() === quatationProducts.variantId.toString()
          );
          return tmtseriesvariant;
        } else {
          const seriesvariant = seriesProduct.seriesvariant.find(
            (obj) =>
              obj._id.toString() === quatationProducts.variantId.toString()
          );
          return seriesvariant;
        }
      } else {
        const variant = product.variant.find(
          (obj) => obj._id.toString() === quatationProducts.variantId.toString()
        );
        return variant;
      }
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch product");
    }
  },
  locationId: async (quatationProducts, _, { models }) => {
    try {
      const product = await models.Product.findById(
        quatationProducts.productId
      );
      if (!product) {
        const seriesProduct = await models.SeriesProduct.findById(
          quatationProducts.productId
        );
        if (!seriesProduct) {
          const tmtseriesProduct = await models.TMTSeriesProduct.findById(
            quatationProducts.productId
          );
          const tmtseriesvariant = tmtseriesProduct.tmtseriesvariant.find(
            (obj) =>
              obj._id.toString() === quatationProducts.variantId.toString()
          );
          const tmtseriesloaction = tmtseriesvariant.tmtserieslocation.find(
            (obj) =>
              obj._id.toString() === quatationProducts.locationId.toString()
          );
          return tmtseriesloaction;
        } else {
          const seriesvariant = seriesProduct.seriesvariant.find(
            (obj) =>
              obj._id.toString() === quatationProducts.variantId.toString()
          );
          const seriesloaction = seriesvariant.serieslocation.find(
            (obj) =>
              obj._id.toString() === quatationProducts.locationId.toString()
          );
          return seriesloaction;
        }
      } else {
        const variant = product.variant.find(
          (obj) => obj._id.toString() === quatationProducts.variantId.toString()
        );
        const location = variant.location.find(
          (obj) =>
            obj._id.toString() === quatationProducts.locationId.toString()
        );
        return location;
      }
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch product");
    }
  },
};
