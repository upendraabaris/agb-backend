// src/graphql/types/enqueryTypes.js

import { gql } from "apollo-server";

export const InventoryType = gql`
  type Inventory {
    id: ID!
    productId: ID!
    variantId: ID!
    currentStock: Int!
  }
`;
