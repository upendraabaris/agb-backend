// src/graphql/types/productHomeOrderTypes.js

import { gql } from "apollo-server";

export const ProductHomeOrderType = gql`
  type ProductHomeOrder {
    displaySection: String
    displayOrder: Int
    productType: String
    productId: String
  }
`;
