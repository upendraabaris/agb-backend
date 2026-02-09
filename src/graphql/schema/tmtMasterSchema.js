import { gql } from "apollo-server";
import { TMTMasterType } from "../types/tmtMasterTypes.js";

export const TMTMaterSchema = gql`
  ${TMTMasterType}

  type Query {
    getTmtMaster(
      search: String
      limit: Int
      offset: Int
      sortBy: String
      sortOrder: String
    ): [TMTMaster]
    getTmtMasterByBrandCat(brandCompareCategory: String): TMTMaster
  }

  type Mutation {
    createTMTMaster(
      brandCompareCategory: String
      section: Boolean
      categories: [String]
      listingComm: Float
      listingCommType: String
      fixedComm: Float
      fixedCommType: String
      shippingComm: Float
      shippingCommType: String
      productComm: Float
      productCommType: String
    ): TMTMaster

    updateTMTMaster(
      id: ID
      hsn: String
      brandCompareCategory: String
      section: Boolean
      listingComm: Float
      listingCommType: String
      fixedComm: Float
      fixedCommType: String
      shippingComm: Float
      shippingCommType: String
      productComm: Float
      productCommType: String
      categories: [String]
    ): TMTMaster

    addTMTMasterVariant(
      brandCompare: String
      tmtseriesvariant: [TMTMasterSeriesVariantInput]
    ): TMTMaster

    updateTMTMasterVariant(
      id: ID
      variantId: ID
      hsn: String
      variantName: String
      moq: Int
    ): TMTMaster

    deleteTMTMaster(id: ID!): TMTMaster!

    deleteTMTMasterVariant(id: ID!, variantId: ID!): TMTMaster
  }

  input TMTMasterSeriesVariantInput {
    variantName: String
    hsn: String
    moq: Int
  }
`;
