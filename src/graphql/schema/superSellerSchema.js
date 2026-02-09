import { gql } from "apollo-server";
import { SuperSellerProductType } from "../types/superSellerTypes.js";

export const SuperSellerProductSchema = gql`
  ${SuperSellerProductType}

  type Query {
    getSuperSellerProductByCat(
      category_name: String
      sortBy: String
      discountPercentage: Float
      minPrice: Float
      maxPrice: Float
    ): [SuperSellerProduct]
    getSuperSellerProduct(name: String): SuperSellerProduct
    getSuperProductBySuperId: [SuperSellerProduct]
    getSuperSellerProductEdit(name: String): SuperSellerProduct
    pendingsupersellerproduct: [SuperSellerProduct]
    approvedsupersellerproduct: [SuperSellerProduct]
    getSuperSellerProductByCatId(cat_id: ID!): [SuperSellerProduct]
    getOrderforSuperSeller: [Order]
    getSingleOrderforSuperSeller(id: ID): Order
  }

  type Mutation {
    createSuperSellerProduct(
      productImages: [Upload]
      silent_features: String
      faq: [SuperFaqInput]
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
      supervariant: [SuperVariantInput]
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
      active: Boolean
    ): SuperSellerProduct

    updateSuperSellerProduct(
      id: ID
      productImages: [Upload]
      silent_features: String
      faq: [SuperFaqInput]
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
      video: String
      supervariant: [SuperVariantInput]
      variant: [SuperVariantInput]
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
      active: Boolean
    ): SuperSellerProduct

    uploadThumbnail(
      id: ID
      filestring: String
      file: Upload
    ): DeleteFileResponse

    uploadCatalogue(
      id: ID
      filestring: String
      file: Upload
    ): DeleteFileResponse

    uploadVideo(id: ID, filestring: String, file: Upload): DeleteFileResponse
    updateDealerLocation(id: ID!, status: Boolean): SuperSellerProduct

    deleteimages(id: ID, url: String): DeleteFileResponse
    deletecatalogue(id: ID, url: String): DeleteFileResponse

    suppersellerproductapprove(
      id: ID
      listingCommType: String
      listingComm: Float
      productCommType: String
      productComm: Float
      shippingCommType: String
      shippingComm: Float
      fixedCommType: String
      fixedComm: Float
      reject: Boolean
      rejectReason: String
      approve: Boolean
      productClassNameID: String
    ): SuperSellerProduct

    deleteSuperSellerProduct(id: ID): SuperSellerProduct
    addLocationToSuperProduct(
      productId: ID
      supervariantId: ID
      superlocationId: ID
      location: SuperLocationInput
    ): SuperSellerProduct
  }

  input SellerArrayInput {
    pincode: [Int]
    status: Boolean
  }

  input SuperLocationInput {
    id: ID
    pincode: [Int]
    allPincode: Boolean
    status: Boolean
    mainStock: Float
    sellerId: ID
    displayStock: Float
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
    sellerarray: [SellerArrayInput]
  }

  input SuperVariantInput {
    id: ID
    superlocation: [SuperLocationInput]
    hsn: String
    variantName: String
    status: Boolean
  }

  input SuperFaqInput {
    question: String
    answer: String
  }
`;
