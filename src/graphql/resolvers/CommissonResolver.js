// src/graphql/resolvers/CommissionResolver.js
import { processFile } from "../../services/fileUploadService.js";
import authenticate from "../../middlewares/auth.js";
import { deleteFile } from "../../services/fileUtils.js";

export const Query = {
  getAllCommissions: async (
    _,
    args,
    { models }
  ) => {
    try {
      
      return await models.Commission.find();
    } catch (error) {
      throw new Error(error);
    }
  },
};

export const Mutation = {
    createCommission: authenticate(["admin"])(
    async (_, args, { models }) => {
      try {
        
        const newCommission = new models.Commission({
            productType:args.productType,
            listingCommType: args.listingCommType,
            listingComm: args.listingComm,
            productCommType: args.productCommType,
            productComm: args.productComm,
            shippingCommType: args.shippingCommType,
            shippingComm: args.shippingComm,
            fixedCommType: args.fixedCommType,
            fixedComm: args.fixedComm,
        });
        return await newCommission.save();
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateCommission: authenticate(["admin"])(
    async (_, args, { models }) => {
      try {
        
        const updateFields = {
            productType:args.productType,
            listingCommType: args.listingCommType,
            listingComm: args.listingComm,
            productCommType: args.productCommType,
            productComm: args.productComm,
            shippingCommType: args.shippingCommType,
            shippingComm: args.shippingComm,
            fixedCommType: args.fixedCommType,
            fixedComm: args.fixedComm,
        };
        
        const updatedCommission = await models.Commission.findByIdAndUpdate(
          id,
          updateFields,
          { new: true }
        );
        return updatedCommission;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  deleteCommission: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      // await deleteChildren(id);
      const deletedCommission = await models.Commission.findByIdAndRemove(id);
      return deletedCommission;
    } catch (error) {
      throw new Error(error);
    }
  }),
};

export const Commission = {};
