// src/graphql/types/tmtMasterTypes.js

import { gql } from "apollo-server";

export const TMTMasterType = gql`
  type TMTMasterSeriesVariant {
    id: ID!
    variantName: String
    moq: Int
    hsn: String,
  }

  type TMTMaster {
    id: ID!
    seriesType: String
    tmtseriesvariant: [TMTMasterSeriesVariant]
    section:Boolean
    brandCompareCategory: String
    categories: [String]
    listingCommType:String
    listingComm:Float
    fixedComm: Float
    fixedCommType:String
    shippingComm: Float
    shippingCommType:String
    productComm: Float
    productCommType:String
  }
`;
