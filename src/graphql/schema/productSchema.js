import { gql } from "apollo-server";
import { ProductType } from "../types/productTypes.js";

export const ProductSchema = gql`
  scalar Upload
  ${ProductType}

  type Query {
    homePageSearch(
      search: String
      page: Int
      itemsPerPage: Int
    ): [SearchProduct]
    getProduct(name: String!): Product
    getProductByID(id: ID): Product
    getAllProductByCat(category_name: String): [Product]
    getProductBySeller(
      seller_id: ID!
      search: String
      limit: Int
      offset: Int
      sortBy: String
      sortOrder: String
    ): [Product]

    getProductByForSeller(
      search: String
      limit: Int
      offset: Int
      sortBy: String
      sortOrder: String
    ): [Product]

    getProductEnquiryByForSeller(
      search: String
      limit: Int
      offset: Int
      sortBy: String
      sortOrder: String
    ): [Product]

    getAllProduct(
      search: String
      limit: Int
      offset: Int
      sortBy: String
      sortOrder: String
    ): [Product]

    getProductByCatId(cat_id: ID!): [Product]
    pendingapprove: [Product]
    approvedproduct: [Product]
    approvedproducts: [Product]
    getProductByCat(
      category_name: String
      sortBy: String
      discountPercentage: Float
      minPrice: Float
      maxPrice: Float
    ): [Product]
  }

  type Mutation {
    createProduct(
      productImages: [Upload]
      variant: [VariantInput]
      faq: [FaqInput]
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
      active: Boolean
      policy: String
      video: String
      youtubeLink: String
      catalogue: String
      approve: Boolean
      categories: [String]
    ): Product

    importProductsFromExcel(file: Upload!): ImportResult!

    addcommandapprove(
      id: ID
      classCode: String
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
    ): Product

    updateProduct(
      id: ID
      productImages: [Upload]
      variant: [VariantInput]
      faq: [FaqInput]
      brand_name: String
      previewName: String
      searchName: String
      fullName: String
      thumbnail: String
      active: Boolean
      returnPolicy: String
      shippingPolicy: String
      cancellationPolicy: String
      description: String
      giftOffer: String
      sellerNotes: String
      policy: String
      video: String
      images: [String]
      youtubeLink: String
      catalogue: String
      categories: [String]
    ): Product

    updateVariantPricesBySeller(
      productId: ID!
      variants: [VariantUpdateInput]!
    ): Product!

    updateVariant(
      id: ID
      variantId: ID
      variantName: String
      moq: Int
      hsn: String
      silent_features: String
      active: Boolean
      minimunQty: Int
      location: [LocationInput]
    ): Product!

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
    activeProduct(id: ID, active: Boolean): Product!
    deleteProduct(id: ID!): Product!
    checkCat(id: ID): Product!

    deleteimages(id: ID, url: String): DeleteFileResponse
    deletecatalogue(id: ID, url: String): DeleteFileResponse
  }

  input LocationInput {
    id: ID
    pincode: [Int]
    state: [String]
    priceType: String
    unitType: String
    price: Float
    gstType: Boolean
    gstRate: Float
    extraChargeType: String
    extraCharge: Float
    transportChargeType: String
    transportCharge: Float
    b2cdiscount: Int
    b2bdiscount: Int
    mainStock: Float
    displayStock: Float
    finalPrice: String
  }

  input VariantInput {
    id: ID
    location: [LocationInput]
    variantName: String
    hsn: String
    allPincode: Boolean
    silent_features: String
    active: Boolean
    minimunQty: Int
    moq: Int
  }

  input VariantUpdateInput {
    variantId: ID!
    locations: [LocationPriceInput]!
  }

  input LocationPriceInput {
    id: ID
    price: Float
    gstType: Boolean
    gstRate: Float
    extraCharge: Float
    transportCharge: Float
    finalPrice: String
    b2cdiscount: Int
    b2bdiscount: Int
    mainStock: Float
    displayStock: Float
  }

  input FaqInput {
    question: String
    answer: String
  }

  type ImportResult {
    successCount: Int!
    failedRows: [FailedRow!]!
  }

  type FailedRow {
    rowNumber: Int!
    error: String!
  }
`;
