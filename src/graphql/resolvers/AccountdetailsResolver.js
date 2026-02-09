// src/graphql/resolvers/AccountdetailsResolver.js

import authenticate from "../../middlewares/auth.js";
import { processFile } from "../../services/fileUploadService.js";
import { deleteFile } from "../../services/fileUtils.js";

export const Query = {
  getAccountdetails: async (_, { id }, { models }) => {
    try {
      return await models.Accountdetails.findById(id);
    } catch (error) {
      throw new Error(error);
    }
  },
  getAllAccountdetails: async (_, args, { models }) => {
    try {
      return await models.Accountdetails.findOne({});
    } catch (error) {
      throw new Error(error);
    }
  },
};

export const Mutation = {
  createAccountdetails: authenticate(["admin"])(
    async (
      _,
      {
        account_no,
        ifsc_code,
        note,
        notedmt,
        notedmtstates,
        account_name,
        upi,
        phone_no,
        bank_name,
        qrimage,
      },
      { models }
    ) => {
      try {
        const account = await models.Accountdetails.findOne({});
        if (!account) {
          const result = await processFile(qrimage);
          const responseData = {
            filename: result.uniqueFilename,
          };
          const filepath = process.env.BASE_URL + responseData.filename;
          const accountdetails = new models.Accountdetails({
            account_no,
            ifsc_code,
            note,
            notedmt,
            notedmtstates,
            account_name,
            upi,
            phone_no,
            bank_name,
            qr: filepath,
          });
          return await accountdetails.save();
        } else {
          throw new Error("Account already exits");
        }
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateAccountdetails: authenticate(["admin"])(
    async (
      _,
      {
        id,
        account_no,
        ifsc_code,
        note,
        notedmt,
        notedmtstates,
        account_name,
        upi,
        phone_no,
        bank_name,
        qrimage,
        qr,
      },
      { models }
    ) => {
      try {
        let filepath; 
        if (qrimage) {
          const result = await processFile(qrimage);
          const responseData = {
            filename: result.uniqueFilename,
          };
          filepath = process.env.BASE_URL + responseData.filename;
        }
        const updateFields = {
          account_no,
          ifsc_code,
          note,
          notedmt,
          notedmtstates,
          account_name,
          upi,
          phone_no,
          bank_name,
          qr,
        };
        if (filepath) {
          updateFields.qr = filepath;
          await deleteFile(qr);
        }
        const updatedAccountdetails =
          await models.Accountdetails.findByIdAndUpdate(id, updateFields, {
            new: true,
          });
        return updatedAccountdetails;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  deleteAccountdetails: authenticate(["admin"])(
    async (_, { id }, { models }) => {
      try {
        const accountdetails = await models.Accountdetails.findByIdAndRemove(
          id
        );
        return accountdetails;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
};

export const AccountDetails = {};
