import mongoose from 'mongoose';

// Singleton document — only one row ever exists.
// Admin reads/writes using getAdSettings / updateAdSettings.
const AdSettingsSchema = new mongoose.Schema({
  // When false: sellers see only Internal URL field (adManager sees External only)
  // When true:  sellers can toggle to External URL (extra surcharge applies)
  allow_external_url_for_sellers: { type: Boolean, default: false },

  // When false: adManagers see only External URL field
  // When true:  adManagers can also choose Internal URL
  allow_internal_url_for_ad_managers: { type: Boolean, default: false },
}, { timestamps: true });

const AdSettings = mongoose.model('AdSettings', AdSettingsSchema);
export default AdSettings;
