import { gql } from 'apollo-server-express';

const defaultAdSchema = gql`
  type DefaultAd {
    id: ID!
    ad_type: String!
    slot_position: Int!
    slot_name: String!
    mobile_image_url: String!
    desktop_image_url: String!
    redirect_url: String
    title: String
    description: String
    is_active: Boolean!
    priority: Int
    createdAt: String
    updatedAt: String
  }

  input DefaultAdInput {
    ad_type: String!
    slot_position: Int!
    mobile_image_url: String!
    desktop_image_url: String!
    redirect_url: String
    title: String
    description: String
    is_active: Boolean
    priority: Int
  }

  input UpdateDefaultAdInput {
    mobile_image_url: String
    desktop_image_url: String
    redirect_url: String
    title: String
    description: String
    is_active: Boolean
    priority: Int
  }

  type DefaultAdResponse {
    success: Boolean!
    message: String
    data: DefaultAd
  }

  type FileUploadResponse {
    success: Boolean!
    url: String
    message: String
  }

  # Combined slot response (paid + default fallback)
  type SlotAd {
    slot_name: String!
    ad_type: String!
    slot_position: Int!
    source: String!              # 'paid' or 'default'
    mobile_image_url: String
    desktop_image_url: String
    redirect_url: String
    title: String
    seller_id: ID                # Only for paid ads
    seller_name: String          # Only for paid ads
  }

  type CategoryAdsResponse {
    category_id: ID!
    category_name: String
    ads: [SlotAd!]!
  }

  # Per-category fallback ad (middle tier between paid and global default)
  type CategoryDefaultAd {
    id: ID!
    category_id: ID!
    ad_type: String!
    slot_position: Int!
    slot_name: String!
    mobile_image_url: String!
    desktop_image_url: String!
    redirect_url: String
    title: String
    is_active: Boolean!
    createdAt: String
    updatedAt: String
  }

  input CategoryDefaultAdInput {
    ad_type: String!
    slot_position: Int!
    mobile_image_url: String!
    desktop_image_url: String!
    redirect_url: String
    title: String
    is_active: Boolean
  }

  input UpdateCategoryDefaultAdInput {
    mobile_image_url: String
    desktop_image_url: String
    redirect_url: String
    title: String
    is_active: Boolean
  }

  type CategoryDefaultAdResponse {
    success: Boolean!
    message: String
    data: CategoryDefaultAd
  }

  extend type Query {
    # Admin queries — global defaults
    getAllDefaultAds: [DefaultAd!]!
    getDefaultAdsByType(ad_type: String!): [DefaultAd!]!
    getDefaultAdBySlot(ad_type: String!, slot_position: Int!): DefaultAd

    # Admin queries — per-category defaults
    getCategoryDefaultAds(category_id: ID!): [CategoryDefaultAd!]!

    # Frontend queries — 3-level fallback (paid → category default → global default)
    getAdsForCategory(category_id: ID!): CategoryAdsResponse
    getAdsForProduct(product_id: ID!): CategoryAdsResponse
  }

  extend type Mutation {
    createDefaultAd(input: DefaultAdInput!): DefaultAdResponse!
    updateDefaultAd(id: ID!, input: UpdateDefaultAdInput!): DefaultAdResponse!
    deleteDefaultAd(id: ID!): DefaultAdResponse!
    toggleDefaultAdStatus(id: ID!): DefaultAdResponse!
    uploadFile(file: Upload!, folder: String): FileUploadResponse!

    # Per-category default ad mutations
    upsertCategoryDefaultAd(category_id: ID!, input: CategoryDefaultAdInput!): CategoryDefaultAdResponse!
    updateCategoryDefaultAd(id: ID!, input: UpdateCategoryDefaultAdInput!): CategoryDefaultAdResponse!
    deleteCategoryDefaultAd(id: ID!): CategoryDefaultAdResponse!
    toggleCategoryDefaultAdStatus(id: ID!): CategoryDefaultAdResponse!
  }
`;

export default defaultAdSchema;