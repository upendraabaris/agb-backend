// src/resolvers/EnqueryResolver.js
import authenticate from "../../middlewares/auth.js";
import jwt from "jsonwebtoken";

export const Query = {
  getProductHomeOrder: async (_, args, { models }) => {
    try {
      const content = await models.ProductHomeOrder.findOne({
        displaySection: args.displaySection,
        displayOrder: args.displayOrder,
      });
      if (content != null) {
        return content;
      }
      return "null";
    } catch (error) {
      throw new Error(error);
    }
  },
};

export const Mutation = {
  updateProductHomeOrder: authenticate(["admin"])(
    async (_, args, { models, req }) => {
      try {
        let updatedContent = await models.ProductHomeOrder.findOne({
          displaySection: args.displaySection,
          displayOrder: args.displayOrder,
        });
        if (!updatedContent) {
          updatedContent = new models.ProductHomeOrder({
            displaySection: args.displaySection,
            displayOrder: args.displayOrder,
            productType: args.productType,
            productId: args.productId,
          });
        } else {
          updatedContent.productType = args.productType;
          updatedContent.productId = args.productId;
        }
        const savedContent = await updatedContent.save();
        return savedContent;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
};

export const ProductHomeOrder = {};
