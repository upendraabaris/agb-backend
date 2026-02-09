// src/graphql/types/tmtseriesProductTypes.js

import { gql } from "apollo-server";

export const TMTSeriesProductType = gql`
  type TMTSeriesLocation {
    id: ID!
    pincode: [Int]
    unitType: String
    priceType: String
    price: Float
    gstType: Boolean
    gstRate: Float
    extraChargeType: String
    extraCharge: Float
    transportChargeType: String
    transportCharge: Float
    finalPrice: String
    b2cdiscount: Int
    b2bdiscount: Int
    sectionDiff: Float
    mainStock: Float
    displayStock: Float
    sellerId: Seller
  }

  type TMTSeriesVariant {
    id: ID!
    allPincode: Boolean
    tmtserieslocation: [TMTSeriesLocation]
    variantName: String
    active: Boolean
    hsn: String
    silent_features: String
    moq: Int
  }

  type TMTSeriesFaq {
    question: String
    answer: String
  }

  type TMTSeriesProduct {
    id: ID!
    seriesType: String
    tmtseriesvariant: [TMTSeriesVariant]
    faq: [TMTSeriesFaq]
    brand_name: String
    approve: Boolean
    previewName: String
    fullName: String
    identifier: String
    thumbnail: String
    sku: String
    active: Boolean
    section: Boolean
    returnPolicy: String
    shippingPolicy: String
    cancellationPolicy: String
    description: String
    giftOffer: String
    sellerNotes: String
    policy: String
    video: String
    youtubeLink: String
    brandCompareCategory: String
    catalogue: String
    images: [String]
    categories: [String]
    listingCommType: String
    listingComm: Float
    fixedComm: Float
    fixedCommType: String
    shippingComm: Float
    shippingCommType: String
    productComm: Float
    productCommType: String
    priceUpdateDate: String
  }
`;
