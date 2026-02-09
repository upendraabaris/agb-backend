// src/graphql/resolvers/ShippingResolver.js
import authenticate from "../../middlewares/auth.js";
import jwt from "jsonwebtoken";

// export const Query = {
//   getStoreFeature: authenticate(["masterAdmin", "admin", "seller", "customer"])(
//     async (_, args, { models }) => {
//       try {
//         return await models.StoreFeature.findOne({});
//       } catch (error) {
//         throw new Error(error);
//       }
//     }
//   ),
// };
export const Query = {
  getStoreFeature: async (_, args, { models }) => {
    try {
      return await models.StoreFeature.findOne({});
    } catch (error) {
      throw new Error(error);
    }
  },
};


export const Mutation = {
  createStoreFeature: authenticate(["masterAdmin", "admin"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const store = await models.StoreFeature.findOne({});
        if (!store) {
          const newStoreFeature = new models.StoreFeature({
            storeName: args.storeName,
            key: args.key,
            solt: args.solt,
            pincode: args.pincode,
            online: args.online,
            dmt: args.dmt,
            cod: args.cod,
            associate: args.associate,
            fixSeries: args.fixSeries,
            customSeries: args.customSeries,
            storeBusinessName: args.storeBusinessName,
            storeBusinessAddress: args.storeBusinessAddress,
            storeBusinessCity: args.storeBusinessCity,
            storeBusinessState: args.storeBusinessState,
            storeBusinessPanNo: args.storeBusinessPanNo,
            storeBusinessGstin: args.storeBusinessGstin,
            storeBusinessCinNo: args.storeBusinessCinNo,
            comBillFormate: args.comBillFormate,
            sellerBillFormate: args.sellerBillFormate,
            ccKey: args.ccKey,
            ccSolt: args.ccSolt,
            bgColor: args.bgColor,
            fontColor: args.fontColor,
            whatsappAPINo: args.whatsappAPINo,
            dtmHelpVideo: args.dtmHelpVideo,
            sellerMasking: args.sellerMasking,
          });
          return await newStoreFeature.save();
        } else {
          store.storeName = args.storeName;
          store.key = args.key;
          store.solt = args.solt;
          store.pincode = args.pincode;          
          store.online = args.online;
          store.dmt = args.dmt;
          store.cod = args.cod;
          store.associate = args.associate;
          store.fixSeries = args.fixSeries;
          store.customSeries = args.customSeries;
          store.storeBusinessName= args.storeBusinessName;
          store.storeBusinessAddress= args.storeBusinessAddress;
          store.storeBusinessCity= args.storeBusinessCity;
          store.storeBusinessState= args.storeBusinessState;
          store.storeBusinessPanNo= args.storeBusinessPanNo;
          store.storeBusinessGstin= args.storeBusinessGstin;
          store.storeBusinessCinNo= args.storeBusinessCinNo;
          store.comBillFormate= args.comBillFormate;
          store.sellerBillFormate= args.sellerBillFormate;
          store.ccKey= args.ccKey;
          store.ccSolt= args.ccSolt;
          store.bgColor= args.bgColor;
          store.fontColor= args.fontColor;
          store.whatsappAPINo= args.whatsappAPINo;
          store.dtmHelpVideo= args.dtmHelpVideo;
          store.sellerMasking= args.sellerMasking;
          await store.save();
          return store;
        }
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  // updateStoreFeature: authenticate(["admin"])(async (_, args, { models }) => {
  //   try {
  //     const updatedShipping = await models.Shipping.findByIdAndUpdate(
  //       id,
  //       {
  //         storeName: args.storeName,
  //         pincode: args.pincode,
  //         dmt: args.dmt,
  //         cod: args.cod,
  //         fixSeries: args.fixSeries,
  //         customSeries: args.customSeries,
  //       },
  //       { new: true }
  //     );
  //     return updatedShipping;
  //   } catch (error) {
  //     throw new Error(error);
  //   }
  // }),
  addAdminRole: authenticate(["masterAdmin"])(
    async (_, { userID }, { models }) => {
      try {
        const user = await models.User.findById(userID);
        if (!user) {
          return { message: "user not found" };
        }
        user.role.push("admin");
        await user.save();
        return { message: "user is now admin" };
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  removeAdminRole: authenticate(["masterAdmin"])(
    async (_, { userID }, { models }) => {
      try {
        const user = await models.User.findById(userID);
        if (!user) {
          return { message: "user not found" };
        }
        const newRole = user.role.filter((item) => item !== "admin");
        user.role = newRole;
        await user.save();
        return { message: "user is not admin" };
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
};

export const StoreFeature = {};
