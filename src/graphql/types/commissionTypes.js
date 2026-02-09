// src/graphql/types/commissionTypes.js

import { gql } from "apollo-server";

export const CommissionType = gql`
  type Commission {
    id: ID!
    productType: String
    listingCommType: String
    listingComm: Float
    productCommType: String
    productComm: Float
    shippingCommType: String
    shippingComm: Float
    fixedCommType: String
    fixedComm: Float
  }
`;
