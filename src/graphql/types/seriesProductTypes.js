// src/graphql/types/seriesProductTypes.js

import { gql } from "apollo-server";

export const SeriesProductType = gql`
  type SeriesLocation {
    id: ID!
    pincode: [Int]
    state: [String]
    allPincode: Boolean
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
    mainStock: Float
    displayStock: Float
    sellerId: Seller
  }

  type SeriesVariant {
    id: ID
    serieslocation: [SeriesLocation]
    variantName: String
    active: Boolean
    allPincode: Boolean
    hsn: String
    silent_features: String
    moq: Int
    finalPrice: String
    transportChargeType: String
    extraChargeType: String
    gstType: Boolean
    gstRate: Float
    unitType: String
    priceType: String
    product: SeriesProduct
  }

  type SeriesFaq {
    question: String
    answer: String
  }

  type SeriesProduct {
    id: ID!
    seriesType: String
    seriesvariant: [SeriesVariant]
    faq: [SeriesFaq]
    brand_name: String
    previewName: String
    fullName: String
    identifier: String
    thumbnail: String
    sku: String
    active: Boolean
    returnPolicy: String
    shippingPolicy: String
    cancellationPolicy: String
    description: String
    giftOffer: String
    sellerNotes: String
    policy: String
    video: String
    youtubeLink: String
    catalogue: String
    images: [String]
    categories: [String]
    listingComm: Float
    listingCommType: String
    fixedComm: Float
    fixedCommType: String
    shippingComm: Float
    shippingCommType: String
    productComm: Float
    productCommType: String
    table: Boolean
  }
`;
