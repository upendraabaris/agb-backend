import DefaultAd from '../../models/DefaultAd.js';
import CategoryRequest from '../../models/CategoryRequest.js';
import Category from '../../models/Category.js';
import { processFileWithFolder } from '../../services/fileUploadService.js';

// Build full URL from a relative uploads path (e.g. "uploads/img.jpg")
// Uses BASE_URL env (e.g. "http://localhost:4000/uploads/") to construct the absolute URL
const getFullImageUrl = (relativePath) => {
  if (!relativePath) return '';
  if (relativePath.startsWith('http')) return relativePath; // already absolute
  // BASE_URL ends with /uploads/ → strip trailing slash for clean join
  const base = (process.env.BASE_URL || 'http://localhost:4000/uploads/').replace(/\/$/, '');
  // relativePath is like "uploads/file.jpg" → strip leading "uploads/"
  const cleanPath = relativePath.replace(/^uploads\//, '');
  return `${base}/${cleanPath}`;
};

// Helper to format response
const formatDefaultAd = (ad) => {
  if (!ad) return null;
  return {
    id: ad._id.toString(),
    ad_type: ad.ad_type,
    slot_position: ad.slot_position,
    slot_name: `${ad.ad_type}_${ad.slot_position}`,
    mobile_image_url: getFullImageUrl(ad.mobile_image_url),
    desktop_image_url: getFullImageUrl(ad.desktop_image_url),
    redirect_url: ad.redirect_url,
    title: ad.title || '',
    description: ad.description || '',
    is_active: ad.is_active,
    priority: ad.priority || 1,
    createdAt: ad.createdAt ? new Date(ad.createdAt).toISOString() : null,
    updatedAt: ad.updatedAt ? new Date(ad.updatedAt).toISOString() : null
  };
};

export const Query = {
  // Get all default ads (admin)
  getAllDefaultAds: async () => {
    try {
      const ads = await DefaultAd.find().sort({ ad_type: 1, slot_position: 1 }).lean();
      return ads.map(formatDefaultAd);
    } catch (error) {
      console.error('[getAllDefaultAds] Error:', error);
      throw new Error('Failed to fetch default ads');
    }
  },

  // Get default ads by type (admin)
  getDefaultAdsByType: async (_, { ad_type }) => {
    try {
      const ads = await DefaultAd.find({ ad_type }).sort({ slot_position: 1 }).lean();
      return ads.map(formatDefaultAd);
    } catch (error) {
      console.error('[getDefaultAdsByType] Error:', error);
      throw new Error('Failed to fetch default ads');
    }
  },

  // Get single default ad by slot
  getDefaultAdBySlot: async (_, { ad_type, slot_position }) => {
    try {
      const ad = await DefaultAd.findOne({ ad_type, slot_position, is_active: true }).lean();
      return formatDefaultAd(ad);
    } catch (error) {
      console.error('[getDefaultAdBySlot] Error:', error);
      throw new Error('Failed to fetch default ad');
    }
  },

  // Main query: Get ads for a category (paid + default fallback)
  getAdsForCategory: async (_, { category_id }) => {
    try {
      const category = await Category.findById(category_id).lean();
      if (!category) {
        throw new Error('Category not found');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Initialize all 8 slots as null
      const slots = {};
      ['banner', 'stamp'].forEach(type => {
        [1, 2, 3, 4].forEach(pos => {
          slots[`${type}_${pos}`] = null;
        });
      });

      // Step 1: Get active PAID ads for this category
      const paidAds = await CategoryRequest.find({
        category_id,
        status: 'approved',
        'pricing_breakdown.start': { $lte: today },
        'pricing_breakdown.end': { $gte: today }
      }).populate('seller_id', 'name companyName').lean();

      // Fill slots with paid ads
      for (const ad of paidAds) {
        const slotName = ad.slot_name; // e.g., 'banner_1'
        if (slots.hasOwnProperty(slotName)) {
          slots[slotName] = {
            slot_name: slotName,
            ad_type: ad.ad_type,
            slot_position: ad.slot_position,
            source: 'paid',
            mobile_image_url: ad.mobile_image_url || ad.media_url,
            desktop_image_url: ad.desktop_image_url || ad.media_url,
            redirect_url: ad.url || null,
            title: ad.title || '',
            seller_id: ad.seller_id?._id?.toString() || null,
            seller_name: ad.seller_id?.companyName || ad.seller_id?.name || null
          };
        }
      }

      // Step 2: Fill empty slots with default ads
      const emptySlots = Object.entries(slots).filter(([_, value]) => value === null);
      
      for (const [slotName] of emptySlots) {
        const [ad_type, position] = slotName.split('_');
        
        const defaultAd = await DefaultAd.findOne({
          ad_type,
          slot_position: parseInt(position),
          is_active: true
        }).sort({ priority: -1 }).lean(); // Highest priority first

        if (defaultAd) {
          slots[slotName] = {
            slot_name: slotName,
            ad_type: ad_type,
            slot_position: parseInt(position),
            source: 'default',
            mobile_image_url: defaultAd.mobile_image_url,
            desktop_image_url: defaultAd.desktop_image_url,
            redirect_url: defaultAd.redirect_url || null,
            title: defaultAd.title || '',
            seller_id: null,
            seller_name: null
          };
        }
      }

      // Convert to array, filter out nulls
      const adsArray = Object.values(slots).filter(ad => ad !== null);

      return {
        category_id: category_id,
        category_name: category.name || '',
        ads: adsArray
      };
    } catch (error) {
      console.error('[getAdsForCategory] Error:', error);
      throw new Error('Failed to fetch ads: ' + error.message);
    }
  }
};

export const Mutation = {
  // Create default ad
  createDefaultAd: async (_, { input }) => {
    try {
      const { ad_type, slot_position, mobile_image_url, desktop_image_url, 
              redirect_url, title, description, is_active, priority } = input;

      // Validate
      if (!['banner', 'stamp'].includes(ad_type)) {
        return { success: false, message: 'Invalid ad_type. Must be banner or stamp', data: null };
      }
      if (![1, 2, 3, 4].includes(slot_position)) {
        return { success: false, message: 'Invalid slot_position. Must be 1-4', data: null };
      }

      // Check if default ad already exists for this slot
      const existing = await DefaultAd.findOne({ ad_type, slot_position });
      if (existing) {
        return { 
          success: false, 
          message: `Default ad already exists for ${ad_type}_${slot_position}. Use update instead.`, 
          data: null 
        };
      }

      const newAd = new DefaultAd({
        ad_type,
        slot_position,
        mobile_image_url,
        desktop_image_url,
        redirect_url: redirect_url || null,
        title: title || '',
        description: description || '',
        is_active: is_active ?? true,
        priority: priority ?? 1
      });

      await newAd.save();

      return {
        success: true,
        message: 'Default ad created successfully',
        data: formatDefaultAd(newAd.toObject())
      };
    } catch (error) {
      console.error('[createDefaultAd] Error:', error);
      return { success: false, message: 'Failed to create default ad: ' + error.message, data: null };
    }
  },

  // Update default ad
  updateDefaultAd: async (_, { id, input }) => {
    try {
      const ad = await DefaultAd.findById(id);
      if (!ad) {
        return { success: false, message: 'Default ad not found', data: null };
      }

      const { mobile_image_url, desktop_image_url, redirect_url, title, description, is_active, priority } = input;

      if (mobile_image_url !== undefined) ad.mobile_image_url = mobile_image_url;
      if (desktop_image_url !== undefined) ad.desktop_image_url = desktop_image_url;
      if (redirect_url !== undefined) ad.redirect_url = redirect_url;
      if (title !== undefined) ad.title = title;
      if (description !== undefined) ad.description = description;
      if (is_active !== undefined) ad.is_active = is_active;
      if (priority !== undefined) ad.priority = priority;

      await ad.save();

      return {
        success: true,
        message: 'Default ad updated successfully',
        data: formatDefaultAd(ad.toObject())
      };
    } catch (error) {
      console.error('[updateDefaultAd] Error:', error);
      return { success: false, message: 'Failed to update default ad: ' + error.message, data: null };
    }
  },

  // Delete default ad
  deleteDefaultAd: async (_, { id }) => {
    try {
      const ad = await DefaultAd.findByIdAndDelete(id);
      if (!ad) {
        return { success: false, message: 'Default ad not found', data: null };
      }

      return {
        success: true,
        message: 'Default ad deleted successfully',
        data: null
      };
    } catch (error) {
      console.error('[deleteDefaultAd] Error:', error);
      return { success: false, message: 'Failed to delete default ad: ' + error.message, data: null };
    }
  },

  // Toggle status
  toggleDefaultAdStatus: async (_, { id }) => {
    try {
      const ad = await DefaultAd.findById(id);
      if (!ad) {
        return { success: false, message: 'Default ad not found', data: null };
      }

      ad.is_active = !ad.is_active;
      await ad.save();

      return {
        success: true,
        message: `Default ad ${ad.is_active ? 'activated' : 'deactivated'} successfully`,
        data: formatDefaultAd(ad.toObject())
      };
    } catch (error) {
      console.error('[toggleDefaultAdStatus] Error:', error);
      return { success: false, message: 'Failed to toggle status: ' + error.message, data: null };
    }
  },

  // Generic file upload (all images go to /uploads/ directly)
  uploadFile: async (_, { file, folder }) => {
    try {
      const result = await processFileWithFolder(file, folder || '');
      return {
        success: true,
        url: result.filePath,
        message: 'File uploaded successfully'
      };
    } catch (error) {
      console.error('[uploadFile] Error:', error);
      return {
        success: false,
        url: null,
        message: 'Failed to upload file: ' + error.message
      };
    }
  }
};

export default { Query, Mutation };
