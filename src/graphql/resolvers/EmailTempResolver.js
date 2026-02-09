// src/graphql/resolvers/EmailTempResolver.js

import authenticate from "../../middlewares/auth.js";
import jwt from "jsonwebtoken";

export const Query = {
  getEmailTemp: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      return await models.EmailTemp.findById(id);
    } catch (error) {
      throw new Error(error);
    }
  }),
  getAllEmailTemp: authenticate(["admin"])(async (_, args, { models }) => {
    try {
      return await models.EmailTemp.find();
    } catch (error) {
      throw new Error(error);
    }
  }),
};

export const Mutation = {
  createEmailTemp: authenticate(["admin"])(
    async (_, { title, html, design }, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const newEmailTemp = new models.EmailTemp({
          userId: user._id,
          title,
          html,
          design,
        });
        return await newEmailTemp.save();
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateEmailTemp: authenticate(["admin"])(
    async (_, { id, title, html, design }, { models }) => {
      try {
        const updatedEmailTemp = await models.EmailTemp.findByIdAndUpdate(
          id,
          { title, html, design },
          { new: true }
        );
        return updatedEmailTemp;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  deleteEmailTemp: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      const deletedEmailTemp = await models.EmailTemp.findByIdAndRemove(id);
      return deletedEmailTemp;
    } catch (error) {
      throw new Error(error);
    }
  }),
};

export const EmailTemp = {};
