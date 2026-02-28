import AdPricingConfig from '../../models/AdPricingConfig.js';
import AdTierMaster from '../../models/AdTierMaster.js';

// Helper to transform multipliers from DB format to GraphQL format
const transformMultipliers = (multipliers) => {
  if (!multipliers) return null;
  return {
    pos1: multipliers['1'] || multipliers.pos1 || 1.0,
    pos2: multipliers['2'] || multipliers.pos2 || 0.8,
    pos3: multipliers['3'] || multipliers.pos3 || 0.65,
    pos4: multipliers['4'] || multipliers.pos4 || 0.5
  };
};

// Helper to transform multipliers from GraphQL input to DB format
const transformMultipliersToDb = (multipliers) => {
  if (!multipliers) return undefined;
  return {
    1: multipliers.pos1 ?? 1.0,
    2: multipliers.pos2 ?? 0.8,
    3: multipliers.pos3 ?? 0.65,
    4: multipliers.pos4 ?? 0.5
  };
};

// Helper to transform tier multipliers
const transformTierMultipliers = (multipliers) => {
  if (!multipliers) return { A1: 1.0, A2: 0.85, A3: 0.70 };
  return {
    A1: multipliers.A1 ?? 1.0,
    A2: multipliers.A2 ?? 0.85,
    A3: multipliers.A3 ?? 0.70
  };
};

// Helper to format config for response
const formatConfigResponse = async (config) => {
  if (!config) return null;
  
  const tier = await AdTierMaster.findById(config.tier_id).lean();
  
  return {
    id: config._id.toString(),
    tier_id: config.tier_id.toString(),
    tier: tier ? {
      id: tier._id.toString(),
      name: tier.name,
      description: tier.description
    } : null,
    banner1_quarterly_price: config.banner1_quarterly_price,
    stamp1_quarterly_price: config.stamp1_quarterly_price,
    duration_multipliers: config.duration_multipliers,
    banner_multipliers: transformMultipliers(config.banner_multipliers),
    stamp_multipliers: transformMultipliers(config.stamp_multipliers),
    tier_multipliers: transformTierMultipliers(config.tier_multipliers),
    is_base_tier: config.is_base_tier || false,
    generated_prices: config.generated_prices || [],
    is_active: config.is_active,
    createdAt: config.createdAt ? new Date(config.createdAt).toISOString() : null,
    updatedAt: config.updatedAt ? new Date(config.updatedAt).toISOString() : null
  };
};

export const Query = {
  // Get all pricing configs
  getAllAdPricingConfigs: async (_, __, { models }) => {
    try {
      const configs = await AdPricingConfig.find().lean();
      const formatted = await Promise.all(configs.map(formatConfigResponse));
      return formatted.filter(c => c !== null);
    } catch (error) {
      console.error('[getAllAdPricingConfigs] Error:', error);
      throw new Error('Failed to fetch pricing configs');
    }
  },

  // Get pricing config by tier ID
  getAdPricingConfigByTier: async (_, { tier_id }, { models }) => {
    try {
      const config = await AdPricingConfig.findOne({ tier_id }).lean();
      return formatConfigResponse(config);
    } catch (error) {
      console.error('[getAdPricingConfigByTier] Error:', error);
      throw new Error('Failed to fetch pricing config');
    }
  },

  // Get specific slot price
  getSlotPrice: async (_, { tier_id, slot_name }, { models }) => {
    try {
      const config = await AdPricingConfig.findOne({ tier_id }).lean();
      if (!config) {
        throw new Error('Pricing config not found for this tier');
      }

      const tier = await AdTierMaster.findById(tier_id).lean();
      const slotPrice = config.generated_prices?.find(p => p.slot_name === slot_name);
      
      if (!slotPrice) {
        throw new Error(`Slot ${slot_name} not found in pricing config`);
      }

      return {
        tier_id: tier_id,
        tier_name: tier?.name || 'Unknown',
        slot_name: slotPrice.slot_name,
        ad_type: slotPrice.ad_type,
        slot_position: slotPrice.slot_position,
        quarterly: slotPrice.quarterly,
        half_yearly: slotPrice.half_yearly,
        yearly: slotPrice.yearly
      };
    } catch (error) {
      console.error('[getSlotPrice] Error:', error);
      throw new Error('Failed to fetch slot price: ' + error.message);
    }
  },

  // Get all slot prices for a tier
  getAllSlotPricesForTier: async (_, { tier_id }, { models }) => {
    try {
      const config = await AdPricingConfig.findOne({ tier_id }).lean();
      if (!config) {
        return [];
      }

      const tier = await AdTierMaster.findById(tier_id).lean();
      
      return (config.generated_prices || []).map(p => ({
        tier_id: tier_id,
        tier_name: tier?.name || 'Unknown',
        slot_name: p.slot_name,
        ad_type: p.ad_type,
        slot_position: p.slot_position,
        quarterly: p.quarterly,
        half_yearly: p.half_yearly,
        yearly: p.yearly
      }));
    } catch (error) {
      console.error('[getAllSlotPricesForTier] Error:', error);
      throw new Error('Failed to fetch slot prices');
    }
  }
};

export const Mutation = {
  // Create or update pricing config for a tier
  upsertAdPricingConfig: async (_, { input }, { models }) => {
    try {
      const { tier_id, banner1_quarterly_price, stamp1_quarterly_price, 
              duration_multipliers, banner_multipliers, stamp_multipliers, 
              tier_multipliers, is_base_tier, auto_cascade_to_other_tiers, is_active } = input;

      // Verify tier exists
      const tier = await AdTierMaster.findById(tier_id);
      if (!tier) {
        return {
          success: false,
          message: 'Tier not found',
          data: null
        };
      }

      // Prepare update data
      const updateData = {
        tier_id,
        banner1_quarterly_price,
        stamp1_quarterly_price,
        is_base_tier: is_base_tier ?? false,
        is_active: is_active ?? true
      };

      // Transform multipliers if provided
      if (duration_multipliers) {
        updateData.duration_multipliers = duration_multipliers;
      }
      if (banner_multipliers) {
        updateData.banner_multipliers = transformMultipliersToDb(banner_multipliers);
      }
      if (stamp_multipliers) {
        updateData.stamp_multipliers = transformMultipliersToDb(stamp_multipliers);
      }
      if (tier_multipliers) {
        updateData.tier_multipliers = tier_multipliers;
      }

      // Find existing or create new
      let config = await AdPricingConfig.findOne({ tier_id });
      
      if (config) {
        // Update existing
        Object.assign(config, updateData);
        await config.save(); // This triggers pre-save hook to regenerate prices
      } else {
        // Create new
        config = new AdPricingConfig(updateData);
        await config.save();
      }

      // Auto-cascade to other tiers if this is base tier and cascade is requested
      if (is_base_tier && auto_cascade_to_other_tiers && tier_multipliers) {
        console.log('[upsertAdPricingConfig] Auto-cascading to other tiers...');
        
        // Get all tiers
        const allTiers = await AdTierMaster.find().lean();
        
        for (const otherTier of allTiers) {
          // Skip the base tier itself
          if (otherTier._id.toString() === tier_id) continue;
          
          const tierName = otherTier.name; // e.g., 'A2', 'A3'
          const multiplier = tier_multipliers[tierName] ?? 1.0;
          
          // Calculate cascaded prices
          const cascadedBannerPrice = Math.round(banner1_quarterly_price * multiplier);
          const cascadedStampPrice = Math.round(stamp1_quarterly_price * multiplier);
          
          // Prepare cascade update data (use same multipliers as base tier)
          const cascadeUpdateData = {
            tier_id: otherTier._id.toString(),
            banner1_quarterly_price: cascadedBannerPrice,
            stamp1_quarterly_price: cascadedStampPrice,
            is_base_tier: false,
            is_active: is_active ?? true
          };
          
          // Copy multipliers from base tier
          if (duration_multipliers) {
            cascadeUpdateData.duration_multipliers = duration_multipliers;
          } else if (config.duration_multipliers) {
            cascadeUpdateData.duration_multipliers = config.duration_multipliers;
          }
          
          if (banner_multipliers) {
            cascadeUpdateData.banner_multipliers = transformMultipliersToDb(banner_multipliers);
          } else if (config.banner_multipliers) {
            cascadeUpdateData.banner_multipliers = config.banner_multipliers;
          }
          
          if (stamp_multipliers) {
            cascadeUpdateData.stamp_multipliers = transformMultipliersToDb(stamp_multipliers);
          } else if (config.stamp_multipliers) {
            cascadeUpdateData.stamp_multipliers = config.stamp_multipliers;
          }
          
          // Find or create config for this tier
          let otherConfig = await AdPricingConfig.findOne({ tier_id: otherTier._id });
          
          if (otherConfig) {
            Object.assign(otherConfig, cascadeUpdateData);
            await otherConfig.save();
          } else {
            otherConfig = new AdPricingConfig(cascadeUpdateData);
            await otherConfig.save();
          }
          
          console.log(`[upsertAdPricingConfig] Cascaded to ${tierName}: Banner=${cascadedBannerPrice}, Stamp=${cascadedStampPrice}`);
        }
      }

      const formatted = await formatConfigResponse(config.toObject());

      return {
        success: true,
        message: auto_cascade_to_other_tiers 
          ? 'Pricing config saved and cascaded to other tiers successfully' 
          : 'Pricing config saved successfully',
        data: formatted
      };
    } catch (error) {
      console.error('[upsertAdPricingConfig] Error:', error);
      return {
        success: false,
        message: 'Failed to save pricing config: ' + error.message,
        data: null
      };
    }
  },

  // Delete pricing config
  deleteAdPricingConfig: async (_, { tier_id }, { models }) => {
    try {
      const config = await AdPricingConfig.findOneAndDelete({ tier_id });
      
      if (!config) {
        return {
          success: false,
          message: 'Pricing config not found',
          data: null
        };
      }

      return {
        success: true,
        message: 'Pricing config deleted successfully',
        data: null
      };
    } catch (error) {
      console.error('[deleteAdPricingConfig] Error:', error);
      return {
        success: false,
        message: 'Failed to delete pricing config: ' + error.message,
        data: null
      };
    }
  }
};

export default { Query, Mutation };
