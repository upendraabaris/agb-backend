// src/resolvers/EnqueryResolver.js
import authenticate from "../../middlewares/auth.js";
import jwt from "jsonwebtoken";

export const Query = {
  getEnquery: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      return await models.Enquery.findById(id);
    } catch (error) {
      throw new Error(error);
    }
  }),
  getAllEnquery: authenticate(["admin"])(
    async (_, { type, limit = 20, offset = 0 }, { models }) => {
      try {
        const query = {};

        if (type) {
          query.types = { $in: [type] };
        }

        const enquiries = await models.Enquery.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset)
          .lean();

        return enquiries.map((e) => ({
          ...e,
          id: e._id.toString(),
        }));
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
};

export const Mutation = {
  createEnquery: async (
    _,
    {
      message,
      active,
      types,
      customerName,
      email,
      mobileNo,
      fullAddress,
      state,
      productName,
    },
    { models, req }
  ) => {
    try {
      // const token = req.headers.authorization.split(" ")[1];
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // const user = await models.User.findById(decoded._id);
      const newEnquery = new models.Enquery({
        message,
        active,
        types,
        customerName,
        email,
        mobileNo,
        fullAddress,
        state,
        productName,
      });
      return await newEnquery.save();
    } catch (error) {
      throw new Error(error);
    }
  },
  updateEnquery: authenticate(["admin"])(
    async (_, { id, active, message }, { models }) => {
      try {
        const updatedEnquery = await models.Enquery.findByIdAndUpdate(
          id,
          { active, message },
          { new: true }
        );
        return updatedEnquery;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  deleteEnquery: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      // await deleteChildren(id);
      const deletedEnquery = await models.Enquery.findByIdAndRemove(id);
      return deletedEnquery;
    } catch (error) {
      throw new Error(error);
    }
  }),
};

export const Enquery = {};
