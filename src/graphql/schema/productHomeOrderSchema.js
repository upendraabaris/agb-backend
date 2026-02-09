import { gql } from "apollo-server";
import { ProductHomeOrderType } from "../types/productHomeOrderTypes.js";

export const ProductHomeOrderSchema = gql`
  ${ProductHomeOrderType}

  type Query {
    getProductHomeOrder(
      displaySection: String
      displayOrder: Int
    ): ProductHomeOrder
  }

  type Mutation {
    updateProductHomeOrder(
      displaySection: String
      displayOrder: Int
      productType: String
      productId: String
    ): ProductHomeOrder!
  }
`;
