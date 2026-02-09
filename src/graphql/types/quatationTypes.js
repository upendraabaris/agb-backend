// src/graphql/types/cartTypes.js

import { gql } from "apollo-server";

export const QuatationType = gql`
  type QuatationProducts {
    productId: TMTSeriesProduct!
    variantId: Variant!
    locationId: Location!
    discount:Float
    quantity: Int!
  }

  type Quatation {
    id: ID!
    customerName:String
    customerAddress:String
    customerGSTIN:String
    customerBusinessName:String
    customerMobile:String
    sellerId:ID
    quatationProducts: [QuatationProducts]
    createdAt: String!
    updatedAt: String!
  }
 
`;
