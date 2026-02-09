// src/graphql/types/enqueryTypes.js

import { gql } from "apollo-server";

export const EnqueryType = gql`
  type Enquery {
    id: ID!
    active: Boolean
    types: String
    message: String
    customerName: String
    email: String
    mobileNo: String
    fullAddress: String
    state: String
    productName: String
    sellerId: ID
    createdAt: String
    updatedAt: String
  }
`;
