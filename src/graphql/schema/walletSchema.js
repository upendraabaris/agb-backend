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
    invoice_id: ID
    createdAt: String
  }

  type WalletInvoice {
    id: ID!
    invoiceNumber: String!
    seller_id: ID!
    transaction_id: ID!
    amount: Float!
    gatewayTransactionId: String
    paymentMode: String
    paymentGateway: String!
    description: String
    # Buyer (receiver) details
    buyerName: String
    buyerEmail: String
    buyerPhone: String
    buyerAddress: String
    buyerGstin: String
    # Company (issuer) details — resolved from StoreFeature at query time
    companyName: String
    companyAddress: String
    companyPan: String
    companyGstin: String
    companyWebsite: String
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
    getWalletInvoice(transactionId: ID!): WalletInvoice
    getWalletInvoices(limit: Int, offset: Int): [WalletInvoice!]!
  }

  type BackfillWalletInvoicesResult {
    processed: Int!
    failed: Int!
  }

  extend type Mutation {
    initiateWalletPayment(amount: Float!): InitiateWalletPaymentResponse!
    # Seller-facing: generate (or return existing) invoice for a successful top-up
    generateWalletInvoice(transactionId: ID!): WalletInvoice!
    # Admin-only: generates invoices for all successful top-ups that are missing one
    backfillWalletInvoices: BackfillWalletInvoicesResult!
  }
`;
