// src/graphql/types/categoryTypes.js

import { gql } from "apollo-server";

export const ShippingType = gql`
  type Shipping {
    id: ID!
    shipping_company: String!
    url: String!
    description: String!
    api: String!
  }
`;
