import { gql } from "apollo-server";
import { AccountDetailsType } from "../types/accountDetailsTypes.js";

export const AccountDetailsSchema = gql`
  ${AccountDetailsType}

  type Query {
    getAccountdetails(id: ID!): AccountDetails
    getAllAccountdetails: AccountDetails!
  }

  type Mutation {
    createAccountdetails(
      account_no: String
      ifsc_code: String
      note: String
      notedmt: String
      notedmtstates: Boolean
      account_name: String
      upi: String
      phone_no: String
      bank_name: String
      qrimage: Upload
    ): AccountDetails!
    updateAccountdetails(
      id: ID
      account_no: String
      ifsc_code: String
      note: String
      notedmt: String
      notedmtstates: Boolean
      account_name: String
      upi: String
      phone_no: String
      bank_name: String
      qrimage: Upload
      qr:String
    ): AccountDetails!
    deleteAccountdetails(id: ID!): AccountDetails!
  }
`;
