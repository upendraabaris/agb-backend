import { gql } from "apollo-server";
import { QuatationType } from "../types/quatationTypes.js";
export const QuatationSchema = gql`
  ${QuatationType}

  type Query {
    quatation: [Quatation]
    singlequatation(id: ID): Quatation
  }

  type Mutation {
    createQuatation(
      quatationProducts: [QuatationInput]
      customerName: String
      customerGSTIN: String
      customerBusinessName: String
      customerMobile: String
      customerAddress: String
    ): Quatation

    updateQuatation(
      id:ID
      quatationProducts: [QuatationInput]
      customerName: String
      customerGSTIN: String
      customerBusinessName: String
      customerMobile: String
      customerAddress: String
    ): Quatation

    deleteQuatation(id: ID): Quatation
  }
  input QuatationInput {
    productId: ID
    variantId: ID
    locationId: ID
    discount: Int
    quantity: Int
  }
`;
