import { gql } from "apollo-server";
import { SeriesProductType } from "../types/seriesProductTypes.js";

export const SeriesProductSchema = gql`
  ${SeriesProductType}

  type Query {
    getSeriesProduct(id: ID): SeriesProduct
    getSeriesProductByCat(
      category_name: String
      sortBy: String
      discountPercentage: Float
      minPrice: Float
      maxPrice: Float
    ): [SeriesProduct]
    getSeriesProductBySeller(seller_id: ID!): [SeriesProduct]
    getSeriesProductByForSeller: [SeriesProduct]
    getSeriesProducts(name: String!): SeriesProduct
    getAllSeriesProduct(
      search: String
      limit: Int
      offset: Int
      sortBy: String
      sortOrder: String
    ): [SeriesProduct]
    getSeriesVariantByForSeller(productId: ID): [SeriesVariant]
    getSeriesProductByCatId(cat_id: ID!): [SeriesProduct]
  }

  type Mutation {
    createSeriesProduct(
      productImages: [Upload]
      faq: [SeriesFaqInput]
      brand_name: String
      previewName: String
      fullName: String
      thumbnail: String
      returnPolicy: String
      shippingPolicy: String
      cancellationPolicy: String
      description: String
      giftOffer: String
      sellerNotes: String
      policy: String
      active: Boolean
      video: String
      youtubeLink: String
      catalogue: String
      categories: [String]
      listingCommType: String
      listingComm: Float
      productCommType: String
      productComm: Float
      shippingCommType: String
      shippingComm: Float
      fixedCommType: String
      fixedComm: Float
      table: Boolean
      seriesType: String
    ): SeriesProduct

    updateSeriesProduct(
      id: ID
      productImages: [Upload]
      faq: [SeriesFaqInput]
      brand_name: String
      previewName: String
      fullName: String
      thumbnail: String
      returnPolicy: String
      shippingPolicy: String
      cancellationPolicy: String
      description: String
      giftOffer: String
      sellerNotes: String
      policy: String
      active: Boolean
      video: String
      youtubeLink: String
      catalogue: String
      categories: [String]
      listingCommType: String
      listingComm: Float
      productCommType: String
      productComm: Float
      shippingCommType: String
      shippingComm: Float
      fixedCommType: String
      fixedComm: Float
      table: Boolean
      seriesType: String
    ): SeriesProduct

    updateSeriesVariant(
      id: ID
      variantId: ID
      locationId: ID
      location: SeriesLocationInput
      allPincode: Boolean
      hsn: String
      silent_features: String
      active: Boolean
      variantName: String
      moq: Int
    ): SeriesProduct!

    updateSeriesVariantMultiSeller(
      id: ID
      variantId: ID
      locationId: ID
      location: SeriesLocationInput
      allPincode: Boolean
      hsn: String
      silent_features: String
      active: Boolean
      variantName: String
      moq: Int
    ): SeriesProduct!

    uploadSeriesThumbnail(
      id: ID
      filestring: String
      file: Upload
    ): DeleteFileResponse

    uploadSeriesCatalogue(
      id: ID
      filestring: String
      file: Upload
    ): DeleteFileResponse

    uploadSeriesVideo(
      id: ID
      filestring: String
      file: Upload
    ): DeleteFileResponse

    updateSeriesVariantById(
      variantId: ID!
      variantName: String
      hsn: String
      moq: Int
      active: Boolean
      silent_features: String
      finalPrice: String
      transportChargeType: String
      extraChargeType: String
      gstType: Boolean
      gstRate: Float
      unitType: String
      priceType: String
    ): SeriesVariant

    multipleSellerAddVariant(
      id: ID
      seriesvariant: [SeriesVariantInput]
    ): SeriesProduct
    addSeriesVariant(id: ID, seriesvariant: [SeriesVariantInput]): SeriesProduct
    deleteseriesimages(id: ID, url: String): DeleteFileResponse
    deleteSeriesProduct(id: ID!): SeriesProduct!
    deleteSeriesVariant(variantId: ID!): DeleteResponse!
  }
  type DeleteResponse {
    id: ID!
    message: String!
  }
  input SeriesLocationInput {
    id: ID
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
  }

  input SeriesVariantInput {
    id: ID
    serieslocation: [SeriesLocationInput]
    variantName: String
    hsn: String
    allPincode: Boolean
    silent_features: String
    active: Boolean
    moq: Int
    finalPrice: String
    transportChargeType: String
    extraChargeType: String
    gstType: Boolean
    gstRate: Float
    unitType: String
    priceType: String
  }

  input SeriesFaqInput {
    question: String
    answer: String
  }
`;
