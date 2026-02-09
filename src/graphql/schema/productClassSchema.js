import { gql } from "apollo-server";
import { ProductClassType } from "../types/productClassTypes.js";

export const ProductClassSchema = gql`
  ${ProductClassType}

  type Query {
    getProductClass(id: ID): ProductClass
    getAllProductClass: [ProductClass]
  }
  type Mutation {
    createProductClass(
      productClassName: String
      productClassDescription: String
      code: String
      listingCommission: Float
      listingType: String
      productCommission: Float
      productType: String
      fixedCommission: Float
      fixedType: String
      shippingCommission: Float
      shippingType: String
      specialStatus: Boolean
    ): ProductClass!

    updateProductClass(
      id: ID!
      productClassName: String
      productClassDescription: String
      code: String
      listingCommission: Float
      listingType: String
      productCommission: Float
      productType: String
      fixedCommission: Float
      fixedType: String
      shippingCommission: Float
      shippingType: String
      specialStatus: Boolean
    ): ProductClass!
    deleteProductClass(id: ID!): ProductClass
  }
`;
