import authenticate from '../../middlewares/auth.js';
import AdSettings from '../../models/AdSettings.js';

export const Query = {
  // Any authenticated user can read (seller/adManager need it to build their form)
  getAdSettings: async () => {
    try {
      let settings = await AdSettings.findOne().lean();
      if (!settings) {
        // Create default singleton if it doesn't exist
        settings = await AdSettings.create({});
      }
      return settings;
    } catch (err) {
      console.error('[getAdSettings] error:', err);
      throw new Error('Failed to fetch ad settings');
    }
  },
};

export const Mutation = {
  updateAdSettings: authenticate(['admin', 'masterAdmin'])(
    async (_, { allow_external_url_for_sellers, allow_internal_url_for_ad_managers }) => {
      try {
        const update = {};
        if (allow_external_url_for_sellers !== undefined && allow_external_url_for_sellers !== null) {
          update.allow_external_url_for_sellers = allow_external_url_for_sellers;
        }
        if (allow_internal_url_for_ad_managers !== undefined && allow_internal_url_for_ad_managers !== null) {
          update.allow_internal_url_for_ad_managers = allow_internal_url_for_ad_managers;
        }

        const settings = await AdSettings.findOneAndUpdate(
          {},
          { $set: update },
          { upsert: true, new: true, lean: true }
        );
        return settings;
      } catch (err) {
        console.error('[updateAdSettings] error:', err);
        throw new Error('Failed to update ad settings');
      }
    }
  ),
};
