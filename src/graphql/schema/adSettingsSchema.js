import { gql } from 'apollo-server-express';

const adSettingsSchema = gql`
  type AdSettings {
    id: ID
    allow_external_url_for_sellers: Boolean!
    allow_internal_url_for_ad_managers: Boolean!
    updatedAt: String
  }

  extend type Query {
    # Public — any logged-in user can fetch to know what URL options are available
    getAdSettings: AdSettings
  }

  extend type Mutation {
    # Admin only
    updateAdSettings(
      allow_external_url_for_sellers: Boolean
      allow_internal_url_for_ad_managers: Boolean
    ): AdSettings
  }
`;

export default adSettingsSchema;
