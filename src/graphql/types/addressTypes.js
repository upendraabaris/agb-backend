// src/graphql/types/addressTypes.js

import { gql } from "apollo-server";

export const AddressType = gql`
  type Address {
    id: ID!
    user: User!
    firstName: String
    lastName: String
    mobileNo: String
    addressLine1: String!
    addressLine2: String
    city: String!
    state: String!
    postalCode: String!
    country: String!
    altrMobileNo: String
    businessName: String
    gstin: String
  }
  
`;
