import { gql } from "apollo-server";
import { TMTSeriesProductType } from "../types/tmtseriesproduct.js";

export const TMTSeriesProductSchema = gql`
  ${TMTSeriesProductType}

  type Query {
    getTMTSeriesProductByCat(
      category_name: String
      sortBy: String
      discountPercentage: Float
      minPrice: Float
      maxPrice: Float
    ): [TMTSeriesProduct]
    getTMTSeriesProduct(id: ID): TMTSeriesProduct
    getTMTSeriesProductByName(name: String): TMTSeriesProduct
    getTMTSeriesProductByCompare(name: String, pincode: Int): [TMTSeriesProduct]
    getAllTMTSeriesProduct(
      search: String
      limit: Int
      offset: Int
      sortBy: String
      sortOrder: String
    ): [TMTSeriesProduct]
    getAllTMTSeriesProductForSeller: [TMTSeriesProduct]
    getTMTSeriesProductByCatId(cat_id: ID!): [TMTSeriesProduct]
  }

  type Mutation {
    createTMTSeriesProduct(
      productImages: [Upload]
      faq: [TMTSeriesFaqInput]
      brand_name: String
      previewName: String
      approve: Boolean
      fullName: String
      thumbnail: String
      returnPolicy: String
      shippingPolicy: String
      cancellationPolicy: String
      description: String
      giftOffer: String
      sellerNotes: String
      policy: String
      video: String
      section: Boolean
      tmtseriesvariant: [TMTSeriesVariantInput]
      youtubeLink: String
      brandCompareCategory: String
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
      active: Boolean
    ): TMTSeriesProduct

    updateTMTPriceBySD(id: ID, price: Float): TMTSeriesProduct

    updateTMTSereiesProduct(
      id: ID
      productImages: [Upload]
      tmtseriesvariant: [TMTSeriesVariantInput]
      faq: [TMTSeriesFaqInput]
      brand_name: String
      previewName: String
      fullName: String
      thumbnail: String
      approve: Boolean
      returnPolicy: String
      shippingPolicy: String
      cancellationPolicy: String
      brandCompareCategory: String
      description: String
      giftOffer: String
      sellerNotes: String
      policy: String
      video: String
      youtubeLink: String
      catalogue: String
      categories: [String]
      active: Boolean
    ): TMTSeriesProduct

    uploadTmtSeriesThumbnail(
      id: ID
      filestring: String
      file: Upload
    ): DeleteFileResponse

    uploadTmtSeriesCatalogue(
      id: ID
      filestring: String
      file: Upload
    ): DeleteFileResponse

    uploadTmtSeriesVideo(
      id: ID
      filestring: String
      file: Upload
    ): DeleteFileResponse

    addTMTSeriesVariant(
      id: ID
      tmtseriesvariant: [TMTSeriesVariantInput]
    ): TMTSeriesProduct
    deleteTMTSeriesProduct(id: ID!): TMTSeriesProduct!
    deleteTmtSeriesimages(id: ID, url: String): DeleteFileResponse
  }

  input TMTSeriesLocationInput {
    id: ID
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
  }

  input TMTSeriesVariantInput {
    id: ID
    tmtserieslocation: [TMTSeriesLocationInput]
    hsn: String
    allPincode: Boolean
    silent_features: String
    variantName: String
    moq: Int
  }

  input TMTSeriesFaqInput {
    question: String
    answer: String
  }
`;
