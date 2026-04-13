import DefaultAd from '../../models/DefaultAd.js';
import CategoryDefaultAd from '../../models/CategoryDefaultAd.js';
import CategoryRequest from '../../models/CategoryRequest.js';
import CategoryRequestMedia from '../../models/CategoryRequestMedia.js';
import CategoryRequestDuration from '../../models/CategoryRequestDuration.js';
import Category from '../../models/Category.js';
import Product from '../../models/Product.js';
import ProductAdRequest from '../../models/ProductAdRequest.js';
import ProductAdRequestMedia from '../../models/ProductAdRequestMedia.js';
import ProductAdRequestDuration from '../../models/ProductAdRequestDuration.js';
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

const formatCategoryDefaultAd = (ad) => {
  if (!ad) return null;
  return {
    id: ad._id.toString(),
    category_id: ad.category_id.toString(),
    ad_type: ad.ad_type,
    slot_position: ad.slot_position,
    slot_name: `${ad.ad_type}_${ad.slot_position}`,
    mobile_image_url: getFullImageUrl(ad.mobile_image_url),
    desktop_image_url: getFullImageUrl(ad.desktop_image_url),
    redirect_url: ad.redirect_url || null,
    title: ad.title || '',
    is_active: ad.is_active,
    createdAt: ad.createdAt ? new Date(ad.createdAt).toISOString() : null,
    updatedAt: ad.updatedAt ? new Date(ad.updatedAt).toISOString() : null
  };
};

// Shared 3-level slot filling logic.
// Fills 8 slots: paid → category default → global default.
async function fillSlotsForCategory(category_id, category_name) {
  const now = new Date();

  // Initialize all 8 slots as null
  const slots = {};
  ['banner', 'stamp'].forEach(type => {
    [1, 2, 3, 4].forEach(pos => {
      slots[`${type}_${pos}`] = null;
    });
  });

  // Step 1: Paid ads — CategoryRequest + CategoryRequestMedia + CategoryRequestDuration
  const paidRequests = await CategoryRequest.find({
    category_id,
    status: { $in: ['approved', 'running'] }
  }).lean();

  if (paidRequests.length > 0) {
    const requestIds = paidRequests.map(r => r._id);
    const [allMedias, allDurations] = await Promise.all([
      CategoryRequestMedia.find({ category_request_id: { $in: requestIds } }).lean(),
      CategoryRequestDuration.find({ category_request_id: { $in: requestIds } }).lean()
    ]);

    // Build duration lookup: "requestId__slot" → duration doc
    const durMap = {};
    allDurations.forEach(d => {
      durMap[`${d.category_request_id.toString()}__${d.slot}`] = d;
    });

    for (const media of allMedias) {
      const slotName = media.slot;
      if (!Object.prototype.hasOwnProperty.call(slots, slotName)) continue;
      if (slots[slotName] !== null) continue; // first-come wins

      const dur = durMap[`${media.category_request_id.toString()}__${slotName}`];
      if (!dur) continue;
      if (dur.status !== 'approved' && dur.status !== 'running') continue;
      const end = dur.end_date ? new Date(dur.end_date) : null;
      const start = dur.start_date ? new Date(dur.start_date) : null;
      if (end && now > end) continue; // expired
      if (start && now < start) continue; // not started yet

      const [ad_type, position] = slotName.split('_');
      slots[slotName] = {
        slot_name: slotName,
        ad_type,
        slot_position: parseInt(position, 10),
        source: 'paid',
        mobile_image_url: getFullImageUrl(media.mobile_image_url),
        desktop_image_url: getFullImageUrl(media.desktop_image_url),
        redirect_url: media.redirect_url || null,
        title: '',
        seller_id: null,
        seller_name: null
      };
    }
  }

  // Step 2: Category default ads (middle fallback)
  const emptyAfterPaid = Object.entries(slots)
    .filter(([, v]) => v === null)
    .map(([k]) => k);

  if (emptyAfterPaid.length > 0) {
    const catDefaults = await CategoryDefaultAd.find({
      category_id,
      is_active: true,
      ad_type: { $in: ['banner', 'stamp'] }
    }).lean();

    const catDefaultMap = {};
    catDefaults.forEach(ad => {
      catDefaultMap[`${ad.ad_type}_${ad.slot_position}`] = ad;
    });

    for (const slotName of emptyAfterPaid) {
      if (catDefaultMap[slotName]) {
        const cad = catDefaultMap[slotName];
        const [ad_type, position] = slotName.split('_');
        slots[slotName] = {
          slot_name: slotName,
          ad_type,
          slot_position: parseInt(position, 10),
          source: 'category_default',
          mobile_image_url: getFullImageUrl(cad.mobile_image_url),
          desktop_image_url: getFullImageUrl(cad.desktop_image_url),
          redirect_url: cad.redirect_url || null,
          title: cad.title || '',
          seller_id: null,
          seller_name: null
        };
      }
    }
  }

  // Step 3: Global default ads
  const emptyAfterCatDefault = Object.entries(slots)
    .filter(([, v]) => v === null)
    .map(([k]) => k);

  for (const slotName of emptyAfterCatDefault) {
    const [ad_type, position] = slotName.split('_');
    // eslint-disable-next-line no-await-in-loop
    const defaultAd = await DefaultAd.findOne({
      ad_type,
      slot_position: parseInt(position, 10),
      is_active: true
    }).sort({ priority: -1 }).lean();

    if (defaultAd) {
      slots[slotName] = {
        slot_name: slotName,
        ad_type,
        slot_position: parseInt(position, 10),
        source: 'default',
        mobile_image_url: getFullImageUrl(defaultAd.mobile_image_url),
        desktop_image_url: getFullImageUrl(defaultAd.desktop_image_url),
        redirect_url: defaultAd.redirect_url || null,
        title: defaultAd.title || '',
        seller_id: null,
        seller_name: null
      };
    }
  }

  return {
    category_id: category_id.toString(),
    category_name: category_name || '',
    ads: Object.values(slots).filter(ad => ad !== null)
  };
}

// 3-level fallback for product pages:
// Step 1: active paid ProductAdRequest slots
// Step 2: CategoryDefaultAd for product's first category
// Step 3: global DefaultAd
async function fillSlotsForProduct(product_id) {
  const now = new Date();

  // Initialize all 8 slots as null
  const slots = {};
  ['banner', 'stamp'].forEach(type => {
    [1, 2, 3, 4].forEach(pos => {
      slots[`${type}_${pos}`] = null;
    });
  });

  // Step 1: Paid productads
  const paidRequests = await ProductAdRequest.find({
    product_id,
    status: { $in: ['approved', 'running'] }
  }).lean();

  if (paidRequests.length > 0) {
    const requestIds = paidRequests.map(r => r._id);
    const [allMedias, allDurations] = await Promise.all([
      ProductAdRequestMedia.find({ product_ad_request_id: { $in: requestIds } }).lean(),
      ProductAdRequestDuration.find({ product_ad_request_id: { $in: requestIds } }).lean()
    ]);

    // Build duration lookup: "requestId__slot" → duration doc
    const durMap = {};
    allDurations.forEach(d => {
      durMap[`${d.product_ad_request_id.toString()}__${d.slot}`] = d;
    });

    for (const media of allMedias) {
      const slotName = media.slot;
      if (!Object.prototype.hasOwnProperty.call(slots, slotName)) continue;
      if (slots[slotName] !== null) continue; // first-come wins

      const dur = durMap[`${media.product_ad_request_id.toString()}__${slotName}`];
      if (!dur) continue;
      if (dur.status !== 'approved' && dur.status !== 'running') continue;
      const end = dur.end_date ? new Date(dur.end_date) : null;
      const start = dur.start_date ? new Date(dur.start_date) : null;
      if (end && now > end) continue; // expired
      if (start && now < start) continue;

      const [ad_type, position] = slotName.split('_');
      slots[slotName] = {
        slot_name: slotName,
        ad_type,
        slot_position: parseInt(position, 10),
        source: 'paid',
        mobile_image_url: getFullImageUrl(media.mobile_image_url),
        desktop_image_url: getFullImageUrl(media.desktop_image_url),
        redirect_url: media.mobile_redirect_url || media.desktop_redirect_url || null,
        title: '',
        seller_id: null,
        seller_name: null
      };
    }
  }

  // Step 2: Category default ads (product's first category)
  const product = await Product.findById(product_id).lean();
  const catId = product &&
    (Array.isArray(product.categories) ? product.categories[0] : product.category_id || product.category);

  if (catId) {
    const emptyAfterPaid = Object.entries(slots)
      .filter(([, v]) => v === null)
      .map(([k]) => k);

    if (emptyAfterPaid.length > 0) {
      const catDefaults = await CategoryDefaultAd.find({
        category_id: catId,
        is_active: true
      }).lean();

      const catDefaultMap = {};
      catDefaults.forEach(ad => {
        catDefaultMap[`${ad.ad_type}_${ad.slot_position}`] = ad;
      });

      for (const slotName of emptyAfterPaid) {
        if (catDefaultMap[slotName]) {
          const cad = catDefaultMap[slotName];
          const [ad_type, position] = slotName.split('_');
          slots[slotName] = {
            slot_name: slotName,
            ad_type,
            slot_position: parseInt(position, 10),
            source: 'category_default',
            mobile_image_url: getFullImageUrl(cad.mobile_image_url),
            desktop_image_url: getFullImageUrl(cad.desktop_image_url),
            redirect_url: cad.redirect_url || null,
            title: cad.title || '',
            seller_id: null,
            seller_name: null
          };
        }
      }
    }
  }

  // Step 3: Global default ads
  const emptyAfterCatDefault = Object.entries(slots)
    .filter(([, v]) => v === null)
    .map(([k]) => k);

  for (const slotName of emptyAfterCatDefault) {
    const [ad_type, position] = slotName.split('_');
    // eslint-disable-next-line no-await-in-loop
    const defaultAd = await DefaultAd.findOne({
      ad_type,
      slot_position: parseInt(position, 10),
      is_active: true
    }).sort({ priority: -1 }).lean();

    if (defaultAd) {
      slots[slotName] = {
        slot_name: slotName,
        ad_type,
        slot_position: parseInt(position, 10),
        source: 'default',
        mobile_image_url: getFullImageUrl(defaultAd.mobile_image_url),
        desktop_image_url: getFullImageUrl(defaultAd.desktop_image_url),
        redirect_url: defaultAd.redirect_url || null,
        title: defaultAd.title || '',
        seller_id: null,
        seller_name: null
      };
    }
  }

  const category = catId ? await Category.findById(catId).lean() : null;
  return {
    category_id: catId ? catId.toString() : '',
    category_name: category?.name || '',
    ads: Object.values(slots).filter(ad => ad !== null)
  };
}

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

  // Admin: get all category-level default ads for a specific category
  getCategoryDefaultAds: async (_, { category_id }) => {
    try {
      const ads = await CategoryDefaultAd.find({ category_id })
        .sort({ ad_type: 1, slot_position: 1 })
        .lean();
      return ads.map(formatCategoryDefaultAd);
    } catch (error) {
      console.error('[getCategoryDefaultAds] Error:', error);
      throw new Error('Failed to fetch category default ads');
    }
  },

  // Frontend: 3-level fallback for category page
  getAdsForCategory: async (_, { category_id }) => {
    try {
      const category = await Category.findById(category_id).lean();
      if (!category) throw new Error('Category not found');
      return fillSlotsForCategory(category_id, category.name);
    } catch (error) {
      console.error('[getAdsForCategory] Error:', error);
      throw new Error('Failed to fetch ads: ' + error.message);
    }
  },

  // Frontend: 3-level fallback for product page
  // Step 1: paid ProductAdRequest slots → Step 2: category default → Step 3: global default
  getAdsForProduct: async (_, { product_id }) => {
    try {
      return await fillSlotsForProduct(product_id);
    } catch (error) {
      console.error('[getAdsForProduct] Error:', error);
      throw new Error('Failed to fetch product ads: ' + error.message);
    }
  },
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
  },

  // Create or update a category-level default ad slot (upsert by category+type+position)
  upsertCategoryDefaultAd: async (_, { category_id, input }) => {
    try {
      const { ad_type, slot_position, mobile_image_url, desktop_image_url,
        redirect_url, title, is_active } = input;

      if (!['banner', 'stamp'].includes(ad_type)) {
        return { success: false, message: 'Invalid ad_type. Must be banner or stamp', data: null };
      }
      if (![1, 2, 3, 4].includes(slot_position)) {
        return { success: false, message: 'Invalid slot_position. Must be 1-4', data: null };
      }

      const existing = await CategoryDefaultAd.findOne({ category_id, ad_type, slot_position });

      if (existing) {
        // Update
        if (mobile_image_url !== undefined) existing.mobile_image_url = mobile_image_url;
        if (desktop_image_url !== undefined) existing.desktop_image_url = desktop_image_url;
        if (redirect_url !== undefined) existing.redirect_url = redirect_url;
        if (title !== undefined) existing.title = title;
        if (is_active !== undefined) existing.is_active = is_active;
        await existing.save();
        return {
          success: true,
          message: 'Category default ad updated successfully',
          data: formatCategoryDefaultAd(existing.toObject())
        };
      }

      // Create
      const newAd = await CategoryDefaultAd.create({
        category_id,
        ad_type,
        slot_position,
        mobile_image_url,
        desktop_image_url,
        redirect_url: redirect_url || null,
        title: title || '',
        is_active: is_active ?? true
      });

      return {
        success: true,
        message: 'Category default ad created successfully',
        data: formatCategoryDefaultAd(newAd.toObject())
      };
    } catch (error) {
      console.error('[upsertCategoryDefaultAd] Error:', error);
      return { success: false, message: 'Failed to upsert category default ad: ' + error.message, data: null };
    }
  },

  // Update existing category default ad by id
  updateCategoryDefaultAd: async (_, { id, input }) => {
    try {
      const ad = await CategoryDefaultAd.findById(id);
      if (!ad) return { success: false, message: 'Category default ad not found', data: null };

      const { mobile_image_url, desktop_image_url, redirect_url, title, is_active } = input;
      if (mobile_image_url !== undefined) ad.mobile_image_url = mobile_image_url;
      if (desktop_image_url !== undefined) ad.desktop_image_url = desktop_image_url;
      if (redirect_url !== undefined) ad.redirect_url = redirect_url;
      if (title !== undefined) ad.title = title;
      if (is_active !== undefined) ad.is_active = is_active;
      await ad.save();

      return {
        success: true,
        message: 'Category default ad updated successfully',
        data: formatCategoryDefaultAd(ad.toObject())
      };
    } catch (error) {
      console.error('[updateCategoryDefaultAd] Error:', error);
      return { success: false, message: 'Failed to update: ' + error.message, data: null };
    }
  },

  // Delete a category default ad by id
  deleteCategoryDefaultAd: async (_, { id }) => {
    try {
      const ad = await CategoryDefaultAd.findByIdAndDelete(id);
      if (!ad) return { success: false, message: 'Category default ad not found', data: null };
      return { success: true, message: 'Category default ad deleted successfully', data: null };
    } catch (error) {
      console.error('[deleteCategoryDefaultAd] Error:', error);
      return { success: false, message: 'Failed to delete: ' + error.message, data: null };
    }
  },

  // Toggle is_active on a category default ad
  toggleCategoryDefaultAdStatus: async (_, { id }) => {
    try {
      const ad = await CategoryDefaultAd.findById(id);
      if (!ad) return { success: false, message: 'Category default ad not found', data: null };
      ad.is_active = !ad.is_active;
      await ad.save();
      return {
        success: true,
        message: `Category default ad ${ad.is_active ? 'activated' : 'deactivated'} successfully`,
        data: formatCategoryDefaultAd(ad.toObject())
      };
    } catch (error) {
      console.error('[toggleCategoryDefaultAdStatus] Error:', error);
      return { success: false, message: 'Failed to toggle status: ' + error.message, data: null };
    }
  }
};

export default { Query, Mutation };
