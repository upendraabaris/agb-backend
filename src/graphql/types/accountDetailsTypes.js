// src/graphql/types/accountDetailsTypes.js

import { gql } from "apollo-server";

export const AccountDetailsType = gql`
  type AccountDetails {
    id: ID
    account_no: String
    ifsc_code: String
    account_name: String
    upi: String
    phone_no: String
    bank_name: String
    qr: String
    note: String
    notedmt: String 
    notedmtstates: Boolean
     
  }
`;
