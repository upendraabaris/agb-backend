import { gql } from "apollo-server";

export const WalletSchema = gql`
  type WalletTransaction {
    id: ID!
    type: String!
    amount: Float!
    source: String!
    description: String
    status: String!
    ccav_tracking_id: String
    createdAt: String
  }

  type SellerWalletType {
    id: ID!
    balance: Float!
    recentTransactions: [WalletTransaction!]!
  }

  # All fields the frontend needs to POST to PayU
  type InitiateWalletPaymentResponse {
    success: Boolean!
    transactionId: ID!
    amount: Float!
    hash: String!
    key: String!
    productinfo: String!
    firstname: String!
    email: String!
    phone: String!
  }

  extend type Query {
    getMyWallet: SellerWalletType!
    getWalletTransactions(limit: Int, offset: Int): [WalletTransaction!]!
  }

  extend type Mutation {
    initiateWalletPayment(amount: Float!): InitiateWalletPaymentResponse!
  }
`;
