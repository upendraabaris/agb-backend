// src/graphql/types/categoryTypes.js

import { gql } from "apollo-server";

export const ProductType = gql`
  type Location {
    id: ID!
    pincode: [Int]
    state: [String]
    unitType: String
    priceType: String
    price: Float
    gstType: Boolean
    gstRate: Float
    extraChargeType: String
    extraCharge: Float
    transportChargeType: String
    transportCharge: Float
    b2cdiscount: Int
    b2bdiscount: Int
    finalPrice: String
    mainStock: Float
    displayStock: Float
    sellerId: Seller
    sellerarray: [SellerArray]
  }
  type SellerArray {
    pincode: [Int]
    sellerId: Seller
    status: Boolean
  }

  type Variant {
    id: ID!
    location: [Location]
    variantName: String
    active: Boolean
    hsn: String
    silent_features: String
    moq: Int
    allPincode: Boolean
    minimunQty: Int
  }

  type Faq {
    id: ID!
    question: String
    answer: String
  }

  type Product {
    id: ID!
    variant: [Variant]
    faq: [Faq]
    brand_name: String
    previewName: String
    searchName: String
    fullName: String
    thumbnail: String
    sku: String
    returnPolicy: String
    shippingPolicy: String
    cancellationPolicy: String
    description: String
    giftOffer: String
    sellerNotes: String
    policy: String
    identifier: String
    video: String
    youtubeLink: String
    catalogue: String
    approve: Boolean
    active: Boolean
    reject: Boolean
    rejectReason: String
    images: [String]
    categories: [String]
    classCode: String
    listingComm: Float
    listingCommType: String
    fixedComm: Float
    fixedCommType: String
    shippingComm: Float
    shippingCommType: String
    productComm: Float
    productCommType: String
    seriesType: String
  }

  type SearchProduct {
    id: ID!
    variant: [Variant]
    seriesvariant: [SeriesVariant]
    tmtseriesvariant: [TMTSeriesVariant]
    faq: [Faq]
    brand_name: String
    brandCompareCategory: String
    previewName: String
    searchName: String
    fullName: String
    thumbnail: String
    sku: String
    returnPolicy: String
    shippingPolicy: String
    cancellationPolicy: String
    description: String
    giftOffer: String
    section: Boolean
    sellerNotes: String
    policy: String
    identifier: String
    video: String
    youtubeLink: String
    catalogue: String
    approve: Boolean
    active: Boolean
    reject: Boolean
    rejectReason: String
    images: [String]
    categories: [String]
    classCode: String
    listingComm: Float
    listingCommType: String
    fixedComm: Float
    fixedCommType: String
    shippingComm: Float
    shippingCommType: String
    productComm: Float
    productCommType: String
  }
`;
