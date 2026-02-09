// src/graphql/resolvers/Ad_hocResolver.js
import authenticate from "../../middlewares/auth.js";
import { deleteFile } from "../../services/fileUtils.js";
import jwt from "jsonwebtoken";

export const Query = {
  getAd_hoc: authenticate(["seller"])(async (_, { id }, { models }) => {
    try {
      return await models.Ad_hoc.findById(id);
    } catch (error) {
      throw new Error(error);
    }
  }),
  getAllAd_hoc: authenticate(["seller"])(async (_, args, { models, req }) => {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await models.User.findById(decoded._id);
      return await models.Ad_hoc.find({ userId: user._id });
    } catch (error) {
      throw new Error(error);
    }
  }),
};

export const Mutation = {
  createAd_hoc: authenticate(["seller"])(
    async (_, { title, price }, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const newAd_hoc = new models.Ad_hoc({ userId: user._id, title, price });
        return await newAd_hoc.save();
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateAd_hoc: authenticate(["seller"])(
    async (_, { id, title, price }, { models }) => {
      try {
        const updatedAd_hoc = await models.Ad_hoc.findByIdAndUpdate(
          id,
          { title, price },
          { new: true }
        );
        return updatedAd_hoc;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  deleteAd_hoc: authenticate(["seller"])(async (_, { id }, { models }) => {
    try {
      // await deleteChildren(id);
      const deletedAd_hoc = await models.Ad_hoc.findByIdAndRemove(id);
      return deletedAd_hoc;
    } catch (error) {
      throw new Error(error);
    }
  }),
  deleteFile: async (_, { url }) => {
    try {
      await deleteFile(url);
      return {
        success: true,
        message: "File deleted successfully.",
      };
    } catch (error) {
      return {
        success: false,
        message: error,
      };
    }
  },
};

export const Ad_hoc = {};
