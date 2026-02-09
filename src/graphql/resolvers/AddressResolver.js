// src/graphql/resolvers/AddressResolver.js

import authenticate from "../../middlewares/auth.js";
import jwt from "jsonwebtoken";

export const Query = {
  getAddress: authenticate(["admin", "customer"])(
    async (_, { id }, { models }) => {
      try {
        return await models.Address.findById(id);
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  getAllAddresses: authenticate(["admin", "customer"])(
    async (_, __, { models }) => {
      try {
        return await models.Address.find();
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  getAllAddressesByUser: authenticate(["customer"])(
    async (_, __, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        return await models.Address.find({ user: decoded._id });
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
};

export const Mutation = {
  createAddress: authenticate(["admin", "customer"])(
    async (
      _,
      {
        firstName,
        lastName,
        mobileNo,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        altrMobileNo,
        businessName,
        gstin,
      },
      { models, req }
    ) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const address = new models.Address({
          user: user._id,
          firstName,
          lastName,
          mobileNo,
          addressLine1,
          addressLine2,
          city,
          state,
          postalCode,
          country,
          altrMobileNo,
          businessName,
          gstin,
        });

        const result = await address.save();
        user.addresses.push(result.id);
        await user.save();

        return result;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  updateAddress: authenticate(["admin", "customer"])(
    async (
      _,
      {
        id,
        firstName,
        lastName,
        mobileNo,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        altrMobileNo,
        businessName,
        gstin,
      },
      { models }
    ) => {
      try {
        const address = await models.Address.findById(id);
        if (!address) {
          throw new Error("Address not found");
        }
        address.firstName = firstName;
        address.lastName = lastName;
        address.mobileNo = mobileNo;
        address.addressLine1 = addressLine1;
        address.addressLine2 = addressLine2;
        address.city = city;
        address.state = state;
        address.postalCode = postalCode;
        address.country = country;
        address.altrMobileNo = altrMobileNo;
        address.businessName = businessName;
        address.gstin = gstin;

        const result = await address.save();
        return result;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  deleteAddress: authenticate(["admin", "customer"])(
    async (_, { id }, { models }) => {
      try {
        const address = await models.Address.findById(id);
        if (!address) {
          throw new Error("Address not found");
        }

        const user = await models.User.findById(address.user);
        user.addresses = user.addresses.filter(
          (addressId) => addressId.toString() !== id
        );
        await user.save();

        const result = await models.Address.findByIdAndRemove(id);
        return result;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
};

export const Address = {
  user: async (address, _, { models }) => {
    try {
      return await models.User.findById(address.user);
    } catch (error) {
      throw new Error(error);
    }
  },
};
