// src/graphql/types/tmtseriesProductTypes.js

import { gql } from "apollo-server";

export const SuperSellerProductType = gql`
  
type SellerArray {
    pincode: [Int]
    sellerId: Seller
    status: Boolean
  }

  type SuperLocation {
    id: ID!
    pincode: [Int]
    mainStock: Float
    displayStock: Float
    sellerId: Seller
    allPincode: Boolean
    status: Boolean
    unitType: String
    finalPrice: String
    priceType: String
    price: Float
    gstRate: Float
    extraChargeType: String
    extraCharge: Float
    transportChargeType: String
    transportCharge: Float
    b2cdiscount: Int
    b2bdiscount: Int
    state: String
    sellerarray: [SellerArray]
  }

  type SuperVariant {
    id: ID!
    superlocation: [SuperLocation]
    variantName: String
    status: Boolean
    hsn: String    
  }

  type SuperFaq {
    question: String
    answer: String
  }

  type SuperSellerProduct {
    id: ID!
    superSellerId: ID
    seriesType: String
    silent_features: String
    supervariant: [SuperVariant]
    faq: [SuperFaq]
    brand_name: String
    approve: Boolean
    previewName: String
    fullName: String
    identifier: String
    thumbnail: String
    sku: String
    active: Boolean
    reject: Boolean
    rejectReason: String
    returnPolicy: String
    shippingPolicy: String
    cancellationPolicy: String
    description: String
    giftOffer: String
    sellerNotes: String
    video: String
    youtubeLink: String
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
