import { gql } from 'apollo-server-express';

const adPricingConfigSchema = gql`
  # Generated price for each slot
  type GeneratedPrice {
    ad_type: String!
    slot_position: Int!
    slot_name: String!
    quarterly: Float!
    half_yearly: Float!
    yearly: Float!
  }

  # Duration multipliers
  type DurationMultipliers {
    quarterly: Float
    half_yearly: Float
    yearly: Float
  }

  # Slot multipliers (keyed by position)
  type SlotMultipliers {
    pos1: Float
    pos2: Float
    pos3: Float
    pos4: Float
  }

  # Tier multipliers (for auto-calculating A2, A3 from A1)
  type TierMultipliers {
    A1: Float
    A2: Float
    A3: Float
  }

  # Tier info for display
  type TierInfo {
    id: ID!
    name: String!
    description: String
  }

  # Main AdPricingConfig type
  type AdPricingConfig {
    id: ID!
    tier_id: ID!
    tier: TierInfo
    banner1_quarterly_price: Float!
    stamp1_quarterly_price: Float!
    duration_multipliers: DurationMultipliers
    banner_multipliers: SlotMultipliers
    stamp_multipliers: SlotMultipliers
    tier_multipliers: TierMultipliers
    is_base_tier: Boolean
    generated_prices: [GeneratedPrice!]
    is_active: Boolean
    createdAt: String
    updatedAt: String
  }

  # Input for duration multipliers
  input DurationMultipliersInput {
    quarterly: Float
    half_yearly: Float
    yearly: Float
  }

  # Input for slot multipliers
  input SlotMultipliersInput {
    pos1: Float
    pos2: Float
    pos3: Float
    pos4: Float
  }

  # Input for tier multipliers
  input TierMultipliersInput {
    A1: Float
    A2: Float
    A3: Float
  }

  # Input for creating/updating pricing config
  input AdPricingConfigInput {
    tier_id: ID!
    banner1_quarterly_price: Float!
    stamp1_quarterly_price: Float!
    duration_multipliers: DurationMultipliersInput
    banner_multipliers: SlotMultipliersInput
    stamp_multipliers: SlotMultipliersInput
    tier_multipliers: TierMultipliersInput
    is_base_tier: Boolean
    auto_cascade_to_other_tiers: Boolean
    is_active: Boolean
  }

  # Response type
  type AdPricingConfigResponse {
    success: Boolean!
    message: String
    data: AdPricingConfig
  }

  # Slot price query result
  type SlotPriceResult {
    tier_id: ID!
    tier_name: String
    slot_name: String!
    ad_type: String!
    slot_position: Int!
    quarterly: Float!
    half_yearly: Float!
    yearly: Float!
  }

  extend type Query {
    # Get all pricing configs
    getAllAdPricingConfigs: [AdPricingConfig!]!
    
    # Get pricing config by tier ID
    getAdPricingConfigByTier(tier_id: ID!): AdPricingConfig
    
    # Get specific slot price
    getSlotPrice(tier_id: ID!, slot_name: String!): SlotPriceResult
    
    # Get all slot prices for a tier
    getAllSlotPricesForTier(tier_id: ID!): [SlotPriceResult!]
  }

  extend type Mutation {
    # Create or update pricing config for a tier
    upsertAdPricingConfig(input: AdPricingConfigInput!): AdPricingConfigResponse!
    
    # Delete pricing config
    deleteAdPricingConfig(tier_id: ID!): AdPricingConfigResponse!
  }
`;

export default adPricingConfigSchema;
