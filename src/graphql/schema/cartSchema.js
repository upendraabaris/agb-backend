import { gql } from "apollo-server";
import { CartType } from "../types/cartTypes.js";
import { CartsType } from "../types/cartsTypes.js";
export const CartSchema = gql`
  ${CartType}
  ${CartsType}

  type Query {
    cart: Cart
    getAllCarts(search: String, limit: Int, offset: Int): [Cart]
  }

  type Mutation {
    addToCart(cartinput: [CartInput]): Cart

    removeFromCart(variantId: ID): Cart

    makePayment(
      orderId: String
      amount: String
      firstname: String
      email: String
      phone: String
    ): PayUTransactionResponse!

    handlePaymentResponse(txn: String): PayUPaymentResponse!
  }
  input CartInput {
    variantId: ID!
    locationId: ID!
    productId: ID!
    sellerId: ID
    quantity: Int!
    iprice: Float
    igst: Float
    idiscount: Int
    iextraChargeType: String
    iextraCharge: Float
    itransportChargeType: String
    itransportCharge: Float
  }
  type Subscription {
    cartUpdated: Carts
  }
`;
