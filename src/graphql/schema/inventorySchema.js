import { gql } from "apollo-server";
import { InventoryType } from "../types/inventoryTypes.js";

export const InventorySchema = gql`
  ${InventoryType}

  type Query {
    getInventory(id: ID!): Inventory
    getAllInventory: [Inventory!]
  }

  type Mutation {
    createInventory(
      id: ID!
      productId: ID!
      variantId: ID!
      currentStock: Int!
    ): Inventory!

    updateInventory(
      id: ID!
      productId: ID!
      variantId: ID!
      currentStock: Int!
    ): Inventory!

    deleteInventory(id: ID!): Inventory!
  }
`;
