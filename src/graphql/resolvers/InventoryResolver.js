// src/resolvers/EnqueryResolver.js
import authenticate from "../../middlewares/auth.js";
import jwt from "jsonwebtoken";

export const Query = {
  getInventory: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      return await models.Inventory.findById(id);
    } catch (error) {
      throw new Error(error);
    }
  }),
  getAllInventory: authenticate(["admin"])(async (_, args, { models }) => {
    try {
      return await models.Inventory.find();
    } catch (error) {
      throw new Error(error);
    }
  }),
};

export const Mutation = {
  createInventory: authenticate(["admin"])(
    async (_, { productId, variantId, currentStock }, { models, req }) => {
      try {
        const newInventory = new Inventory.Enquery({
          productId,
          variantId,
          currentStock,
        });
        return await newInventory.save();
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateInventory: authenticate(["admin"])(
    async (_, { id, productId, variantId, currentStock }, { models }) => {
      try {
        const updatedInventry = await models.Inventry.findByIdAndUpdate(
          id,
          { productId, variantId, currentStock },
          { new: true }
        );
        return updatedInventry;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  deleteInventory: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      // await deleteChildren(id);
      const deletedInventry = await models.Inventry.findByIdAndRemove(id);
      return deletedInventry;
    } catch (error) {
      throw new Error(error);
    }
  }),
};

export const Inventory = {};
