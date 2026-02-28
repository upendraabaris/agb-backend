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

  extend type Query {
    # Admin queries
    getAllDefaultAds: [DefaultAd!]!
    getDefaultAdsByType(ad_type: String!): [DefaultAd!]!
    getDefaultAdBySlot(ad_type: String!, slot_position: Int!): DefaultAd
    
    # Frontend query - gets paid ads with default fallback
    getAdsForCategory(category_id: ID!): CategoryAdsResponse
  }

  extend type Mutation {
    createDefaultAd(input: DefaultAdInput!): DefaultAdResponse!
    updateDefaultAd(id: ID!, input: UpdateDefaultAdInput!): DefaultAdResponse!
    deleteDefaultAd(id: ID!): DefaultAdResponse!
    toggleDefaultAdStatus(id: ID!): DefaultAdResponse!
    uploadFile(file: Upload!, folder: String): FileUploadResponse!
  }
`;

export default defaultAdSchema;