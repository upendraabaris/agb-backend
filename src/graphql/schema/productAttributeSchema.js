import { gql } from "apollo-server";
import { ProcdutAttributeType } from "../types/productAttributeTypes.js";

export const ProcdutAttributeSchema = gql`
  ${ProcdutAttributeType}

  type Query {
    getProductAttribute(id: ID!): ProductAttribute
    getAllProductAttributes: [ProductAttribute]

    getGst(productAttributeId: ID!): [GST]
    getUnitType(productAttributeId: ID!): [UnitType]
    getPriceType(productAttributeId: ID!): [PriceType]
    getExtraCharge(productAttributeId: ID!): [ExtraCharge]
    getTransportCharge(productAttributeId: ID!): [TransportCharge]
    getFinalPrice(productAttributeId: ID!): [FinalPrice]
  }

  type Mutation {
    createProductAttribute(
      gst: [GstInput]
      unitType: [UnitTypeInput]
      priceType: [PriceTypeInput]
      extraCharge: [ExtraChargeInput]
      transportCharge: [TransportChargeInput]
      finalPrice: [FinalPriceInput]
    ): ProductAttribute
    updateProductAttribute(
      id: ID!
      gst: [GstInput]
      unitType: [UnitTypeInput]
      priceType: [PriceTypeInput]
      extraCharge: [ExtraChargeInput]
      transportCharge: [TransportChargeInput]
      finalPrice: [FinalPriceInput]
    ): ProductAttribute
    deleteProductAttribute(id: ID!): ProductAttribute

    createGst(productAttributeId: ID!, title: String!, gstRate: Float!): GST
    updateGst(
      productAttributeId: ID!
      gstId: ID!
      title: String
      gstRate: Float
    ): GST
    deleteGst(productAttributeId: ID!, gstId: ID!): GST

    createUnitType(
      productAttributeId: ID!
      title: String!
      symbol: String!
    ): UnitType
    updateUnitType(
      productAttributeId: ID!
      unitTypeID: ID!
      title: String
      symbol: String
    ): UnitType
    deleteUnitType(productAttributeId: ID!, unitTypeID: ID!): UnitType

    createPriceType(
      productAttributeId: ID!
      title: String!
      symbol: String!
    ): PriceType
    updatePriceType(
      productAttributeId: ID!
      priceTypeID: ID!
      title: String
      symbol: String
    ): PriceType
    deletePriceType(productAttributeId: ID!, priceTypeID: ID!): PriceType

    createExtraCharge(productAttributeId: ID!, title: String!): ExtraCharge
    updateExtraCharge(
      productAttributeId: ID!
      extraChargeID: ID!
      title: String
    ): ExtraCharge
    deleteExtraCharge(productAttributeId: ID!, extraChargeID: ID!): ExtraCharge

    createTransportCharge(
      productAttributeId: ID!
      title: String!
    ): TransportCharge
    updateTransportCharge(
      productAttributeId: ID!
      transportChargeID: ID!
      title: String
    ): TransportCharge
    deleteTransportCharge(
      productAttributeId: ID!
      transportChargeID: ID!
    ): TransportCharge

    createFinalPrice(productAttributeId: ID!, title: String!): FinalPrice
    updateFinalPrice(
      productAttributeId: ID!
      finalPriceID: ID!
      title: String
    ): FinalPrice
    deleteFinalPrice(productAttributeId: ID!, finalPriceID: ID!): FinalPrice
  }

  input GstInput {
    title: String
    gstRate: Float
  }

  input UnitTypeInput {
    title: String
    symbol: String
  }

  input PriceTypeInput {
    title: String
    symbol: String
  }

  input ExtraChargeInput {
    title: String
  }

  input TransportChargeInput {
    title: String
  }

  input FinalPriceInput {
    title: String
  }
`;
