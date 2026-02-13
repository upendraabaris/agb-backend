import authenticate from "../../middlewares/auth.js";

export const Query = {
  adTierProductCategoryMappings: authenticate(["admin"])(async (_, __, { models }) => {
    try {
      return await models.AdTierProductCategoryMapping.find().populate('ad_tier_id').populate('category_ids');
    } catch (error) {
      throw new Error(`Failed to fetch mappings: ${error.message}`);
    }
  }),

  getAdTierProductCategoryMapping: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      const mapping = await models.AdTierProductCategoryMapping.findById(id).populate('ad_tier_id').populate('category_ids');
      if (!mapping) throw new Error('Mapping not found');
      return mapping;
    } catch (error) {
      throw new Error(`Failed to fetch mapping: ${error.message}`);
    }
  }),

  getTiersByCategory: async (_, { categoryId }, { models }) => {
    try {
      const mappings = await models.AdTierProductCategoryMapping.find({
        category_ids: categoryId
      }).populate('ad_tier_id');
      
      return mappings.map(m => m.ad_tier_id);
    } catch (error) {
      throw new Error(`Failed to fetch tiers for category: ${error.message}`);
    }
  },
};

export const Mutation = {
  createAdTierProductCategoryMapping: authenticate(["admin"]) (async (_, { input }, { models }) => {
    try {
      const existing = await models.AdTierProductCategoryMapping.findOne({ ad_tier_id: input.ad_tier_id });
      if (existing) {
        // merge or replace — here we replace categories for simplicity
        existing.category_ids = input.category_ids;
        return await existing.save();
      }
      const mapping = new models.AdTierProductCategoryMapping(input);
      return await mapping.save();
    } catch (error) {
      throw new Error(`Failed to create mapping: ${error.message}`);
    }
  }),

  updateAdTierProductCategoryMapping: authenticate(["admin"]) (async (_, { id, input }, { models }) => {
    try {
      const mapping = await models.AdTierProductCategoryMapping.findById(id);
      if (!mapping) throw new Error('Mapping not found');
      mapping.ad_tier_id = input.ad_tier_id;
      mapping.category_ids = input.category_ids;
      return await mapping.save();
    } catch (error) {
      throw new Error(`Failed to update mapping: ${error.message}`);
    }
  }),

  deleteAdTierProductCategoryMapping: authenticate(["admin"]) (async (_, { id }, { models }) => {
    try {
      const mapping = await models.AdTierProductCategoryMapping.findByIdAndDelete(id);
      if (!mapping) throw new Error('Mapping not found');
      return { success: true, message: 'Mapping deleted' };
    } catch (error) {
      throw new Error(`Failed to delete mapping: ${error.message}`);
    }
  }),
};
