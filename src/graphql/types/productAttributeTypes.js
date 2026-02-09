// src/graphql/types/categoryTypes.js

import { gql } from "apollo-server";

export const ProcdutAttributeType = gql`
  type GST {
    id: ID
    title: String
    gstRate: Float
  }

  type UnitType {
    id: ID
    title: String
    symbol: String
  }

  type PriceType {
    id: ID
    title: String
    symbol: String
  }

  type ExtraCharge {
    id: ID
    title: String
  }

  type TransportCharge {
    id: ID
    title: String
  }

  type FinalPrice {
    id: ID
    title: String
  }

  type ProductAttribute {
    id: ID!
    gst: GST!
    unitType: UnitType!
    priceType: PriceType!
    extraCharge: ExtraCharge!
    transportCharge: TransportCharge!
    finalPrice: FinalPrice!
  }
`;
