import { gql } from "apollo-server";
import { AddressType } from "../types/addressTypes.js";

export const AddressSchema = gql`
  ${AddressType}

  type Query {
    getAddress(id: ID!): Address
    getAllAddresses: [Address!]
    getAllAddressesByUser: [Address!]
  }

  type Mutation {
    createAddress(
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
    ): Address!

    updateAddress(
      id: ID!
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
    ): Address!

    deleteAddress(id: ID!): Address!
  }
`;
