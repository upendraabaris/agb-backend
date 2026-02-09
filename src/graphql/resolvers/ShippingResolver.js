// src/graphql/resolvers/ShippingResolver.js
import authenticate from "../../middlewares/auth.js";
import jwt from "jsonwebtoken";

export const Query = {
  getShipping: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      return await models.Shipping.findById(id);
    } catch (error) {
      throw new Error(error);
    }
  }),
  getAllShipping: authenticate(["admin", "seller", "subBusiness"])(
    async (_, args, { models }) => {
      try {
        return await models.Shipping.find();
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
};

export const Mutation = {
  createShipping: authenticate(["admin"])(
    async (_, { shipping_company, url, description, api }, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const newShipping = new models.Shipping({
          userId: user._id,
          shipping_company,
          url,
          description,
          api,
        });
        return await newShipping.save();
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateShipping: authenticate(["admin"])(
    async (_, { id, shipping_company, url, description, api }, { models }) => {
      try {
        const updatedShipping = await models.Shipping.findByIdAndUpdate(
          id,
          { shipping_company, url, description, api },
          { new: true }
        );
        return updatedShipping;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  deleteShipping: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      const deletedShipping = await models.Shipping.findByIdAndRemove(id);
      return deletedShipping;
    } catch (error) {
      throw new Error(error);
    }
  }),
};

export const Shipping = {};
