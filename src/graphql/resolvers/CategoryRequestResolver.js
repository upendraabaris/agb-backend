import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import authenticate from '../../middlewares/auth.js';

export const Query = {
  // Get current seller's category requests (uses JWT token from context)
  getMyAds: authenticate(["seller"])(async (_, __, { models, req }) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) throw new Error('Authorization header missing');

      const token = authHeader.split(' ')[1];
      if (!token) throw new Error('Token missing');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const sellerId = decoded._id;

      // Fetch requests with lean for better performance
      const requests = await models.CategoryRequest.find({ seller_id: sellerId })
        .populate('category_id', 'name')
        .populate('tier_id', '_id')
        .lean()
        .sort({ createdAt: -1 });

      if (!requests || requests.length === 0) {
        return [];
      }

      // Batch fetch all medias and durations instead of individual queries (N+1 optimization)
      const requestIds = requests.map(r => r._id);
      const allMedias = await models.CategoryRequestMedia.find({
        category_request_id: { $in: requestIds }
      }).lean();

      const allDurations = await models.CategoryRequestDuration.find({
        category_request_id: { $in: requestIds }
      }).lean();

      // Create maps for fast lookup
      const mediasMap = {};
      const durationsMap = {};

      allMedias.forEach(m => {
        const key = m.category_request_id.toString();
        if (!mediasMap[key]) mediasMap[key] = [];
        mediasMap[key].push(m);
      });

      allDurations.forEach(d => {
        const key = d.category_request_id.toString();
        if (!durationsMap[key]) durationsMap[key] = [];
        durationsMap[key].push(d);
      });

      // Build enriched requests with proper date formatting
      const enrichedRequests = requests
        .map(req => {
          const reqId = req._id.toString();
          let tierId = req.tier_id;

          // Get tier_id from populated object
          if (tierId && typeof tierId === 'object') {
            tierId = tierId._id || tierId;
          }
          tierId = tierId ? tierId.toString() : null;

          // Skip if no tier_id
          if (!tierId) return null;

          return {
            id: reqId,
            category_id: req.category_id?._id?.toString(),
            categoryName: req.category_id?.name || 'Unknown',
            tier_id: tierId,
            status: req.status,
            createdAt: req.createdAt ? new Date(req.createdAt).toISOString() : null,
            updatedAt: req.updatedAt ? new Date(req.updatedAt).toISOString() : null,
            medias: (mediasMap[reqId] || []).map(m => ({
              id: m._id?.toString(),
              slot: m.slot,
              media_type: m.media_type,
              mobile_image_url: m.mobile_image_url,
              desktop_image_url: m.desktop_image_url,
              mobile_redirect_url: m.mobile_redirect_url,
              desktop_redirect_url: m.desktop_redirect_url
            })),
            durations: (durationsMap[reqId] || []).map(d => ({
              id: d._id?.toString(),
              slot: d.slot,
              duration_days: d.duration_days,
              start_date: d.start_date ? new Date(d.start_date).toISOString() : null,
              end_date: d.end_date ? new Date(d.end_date).toISOString() : null,
              status: d.status
            }))
          };
        })
        .filter(r => r !== null);

      return enrichedRequests;
    } catch (err) {
      console.error('[getMyAds] error:', err);
      throw err;
    }
  }),

  getCategoryRequestsBySeller: async (_, { sellerId }, { models }) => {
    return models.CategoryRequest.find({ seller_id: sellerId }).sort({ createdAt: -1 });
  },

  getCategoryRequests: async (_, __, { models }) => {
    return models.CategoryRequest.find().sort({ createdAt: -1 });
  },

  getCategoryRequestDurations: async (_, { requestId }, { models }) => {
    return models.CategoryRequestDuration.find({ category_request_id: requestId }).sort({ createdAt: -1 });
  },

  // Get categories with available slot count for each tier
  getCategoriesWithAvailableSlots: async (_, __, { models }) => {
    try {
      console.log('[CategoryRequestResolver] getCategoriesWithAvailableSlots called');

      let categories = await models.Category.find({
        $or: [{ parent: null }, { parent: { $exists: true } }]
      })
        .populate('adTierId', '_id name')
        .lean();

      console.log(`[CategoryRequestResolver] top-level categories found: ${categories?.length || 0}`);

      // Diagnostic fallback: if none found, fetch all categories to inspect data shape
      if (!categories || categories.length === 0) {
        const allCats = await models.Category.find().populate('adTierId', '_id name').lean();
        console.log(`[CategoryRequestResolver] fallback - all categories count: ${allCats?.length || 0}`);
        categories = allCats;
      }

      // Fetch all requests and durations once for efficiency (per-category counting)
      const allRequests = await models.CategoryRequest.find().select('_id category_id').lean();
      const allDurations = await models.CategoryRequestDuration.find({
        status: { $in: ['running', 'approved'] }
      }).select('category_request_id slot').lean();

      // Build maps for fast lookup per category
      const requestsByCategory = {};
      allRequests.forEach(req => {
        const catId = req.category_id.toString();
        if (!requestsByCategory[catId]) requestsByCategory[catId] = [];
        requestsByCategory[catId].push(req._id.toString());
      });

      const result = categories.map(cat => {
        if (!cat.adTierId) {
          return {
            id: cat._id?.toString(),
            name: cat.name || 'Unknown',
            image: cat.image || null,
            description: cat.description || '',
            order: cat.order || 0,
            adTierId: null,
            tierId: null,
            availableSlots: 8,
            bookedSlots: 0
          };
        }

        const tierId = cat.adTierId._id?.toString();
        // Count booked slots for THIS category only
        const catIdStr = cat._id.toString();
        const requestIdsForCat = requestsByCategory[catIdStr] || [];
        const bookedCount = allDurations.filter(d =>
          requestIdsForCat.includes(d.category_request_id.toString())
        ).length;

        // Count per-type booked slots for THIS category
        const bookedBannerCount = allDurations.filter(d =>
          requestIdsForCat.includes(d.category_request_id.toString()) &&
          d.slot.startsWith('banner_')
        ).length;
        const bookedStampCount = allDurations.filter(d =>
          requestIdsForCat.includes(d.category_request_id.toString()) &&
          d.slot.startsWith('stamp_')
        ).length;

        const availableSlots = Math.max(0, 8 - bookedCount);

        const slotNames = ['banner_1', 'banner_2', 'banner_3', 'banner_4', 'stamp_1', 'stamp_2', 'stamp_3', 'stamp_4'];
        const bookedSlots = allDurations
          .filter(d => requestIdsForCat.includes(d.category_request_id.toString()))
          .map(d => d.slot);

        const slotStatuses = slotNames.map(slotName => ({
          slot: slotName,
          available: !bookedSlots.includes(slotName)
        }));

        return {
          id: cat._id?.toString(),
          name: cat.name || 'Unknown',
          image: cat.image || null,
          description: cat.description || '',
          order: cat.order || 0,
          adTierId: tierId,
          tierId: {
            id: tierId,
            name: cat.adTierId.name || 'Unknown Tier'
          },
          availableSlots,
          bookedSlots: bookedCount,
          bookedBanner: bookedBannerCount,
          bookedStamp: bookedStampCount,
          slotStatuses: slotStatuses
        };
      });

      return result.filter(cat => cat !== null);
    } catch (err) {
      console.error('[CategoryRequestResolver] getCategoriesWithAvailableSlots error:', err);
      return [];
    }
  },

  // Get pricing for a category by tier
  getCategoryPricing: async (_, { categoryId }, { models }) => {
    try {
      const category = await models.Category.findById(categoryId).populate('adTierId').lean();
      if (!category || !category.adTierId) return null;

      const tierId = category.adTierId._id;
      // Fetch ad categories with pricing for this tier
      const adCategories = await models.AdCategory.find({ categoryMasterId: tierId }).lean();

      return {
        categoryId,
        tierId: tierId.toString(),
        tierName: category.adTierId.name || 'Unknown Tier',
        adCategories: adCategories.map(ac => ({
          id: ac._id?.toString(),
          ad_type: ac.ad_type || 'unknown',
          price: ac.price || 0,
          priority: ac.priority || 0,
          duration_days: ac.duration_days || 30
        }))
      };
    } catch (err) {
      console.error('[CategoryRequestResolver] getCategoryPricing error:', err);
      throw new Error('Failed to fetch pricing: ' + err.message);
    }
  },

  // Get approved ads for a specific category (for user view)
  getApprovedAdsByCategory: async (_, { categoryId, categoryName }, { models }) => {
    try {
      let finalCategoryId = categoryId;

      // If categoryName is provided, look up the categoryId (case-insensitive, trimmed)
      if (!categoryId && categoryName) {
        const nameTrim = categoryName.trim();
        const escaped = nameTrim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Try exact case-insensitive match first
        let category = await models.Category.findOne({ name: { $regex: `^${escaped}$`, $options: 'i' } }).lean();
        // Fallback to contains match (in case of small variations)
        if (!category) {
          category = await models.Category.findOne({ name: { $regex: escaped, $options: 'i' } }).lean();
        }
        if (category) {
          finalCategoryId = category._id;
        } else {
          return []; // Category not found
        }
      }

      if (!finalCategoryId) {
        console.warn('[getApprovedAdsByCategory] missing categoryId and categoryName');
        return [];
      }

      console.log('[getApprovedAdsByCategory] resolved finalCategoryId:', finalCategoryId, 'categoryName:', categoryName);

      // Find all approved requests for this category
      const approvedRequests = await models.CategoryRequest.find({
        category_id: finalCategoryId,
        status: 'approved'
      })
        .populate('seller_id', 'first_name last_name email')
        .populate('category_id', 'name')
        .lean()
        .sort({ createdAt: -1 });

      if (!approvedRequests || approvedRequests.length === 0) {
        console.log('[getApprovedAdsByCategory] no approved requests found for category:', finalCategoryId);
        return [];
      }

      console.log('[getApprovedAdsByCategory] approvedRequests count:', approvedRequests.length, 'ids:', approvedRequests.map(r => r._id.toString()));

      // Batch fetch medias and durations
      const requestIds = approvedRequests.map(r => r._id);
      const allMedias = await models.CategoryRequestMedia.find({
        category_request_id: { $in: requestIds }
      }).lean();

      const allDurations = await models.CategoryRequestDuration.find({
        category_request_id: { $in: requestIds }
      }).lean();

      // Create maps for fast lookup
      const mediasMap = {};
      const durationsMap = {};

      allMedias.forEach(m => {
        const key = m.category_request_id.toString();
        if (!mediasMap[key]) mediasMap[key] = [];
        mediasMap[key].push(m);
      });

      allDurations.forEach(d => {
        const key = d.category_request_id.toString();
        if (!durationsMap[key]) durationsMap[key] = [];
        durationsMap[key].push(d);
      });

      console.log('[getApprovedAdsByCategory] allMedias count:', allMedias.length, 'allDurations count:', allDurations.length);

      // Build approved ads with seller info
      const runningInfo = [];
      const approvedAds = approvedRequests
        .map(req => {
          const reqId = req._id.toString();
          const sellerName = req.seller_id
            ? `${req.seller_id.first_name || ''} ${req.seller_id.last_name || ''}`.trim()
            : 'Unknown Seller';

          // Check if ad is still running (within start and end dates)
          const durations = durationsMap[reqId] || [];
          const now = new Date();

          // Treat as running if any duration is approved and either within dates or dates not set
          const isRunning = durations.some(d => {
            if (d.status !== 'approved') return false;
            const startDate = d.start_date ? new Date(d.start_date) : null;
            const endDate = d.end_date ? new Date(d.end_date) : null;
            if (startDate && endDate) {
              return now >= startDate && now <= endDate;
            }
            // If dates are not set but status is 'approved', consider it running (fallback)
            return true;
          });

          // Collect running info for debugging
          runningInfo.push({ reqId, isRunning, durations: durations.map(dur => ({ id: dur._id?.toString(), start: dur.start_date, end: dur.end_date, status: dur.status })) });

          // Only return if ad is running
          if (!isRunning) return null;

          return {
            id: reqId,
            sellerName,
            sellerEmail: req.seller_id?.email || 'N/A',
            categoryId: req.category_id?._id?.toString(),
            categoryName: req.category_id?.name || 'Unknown',
            medias: (mediasMap[reqId] || []).map(m => ({
              id: m._id?.toString(),
              slot: m.slot,
              media_type: m.media_type,
              mobile_image_url: m.mobile_image_url,
              desktop_image_url: m.desktop_image_url,
              mobile_redirect_url: m.mobile_redirect_url,
              desktop_redirect_url: m.desktop_redirect_url
            })),
            durations: (durationsMap[reqId] || []).map(d => ({
              id: d._id?.toString(),
              slot: d.slot,
              duration_days: d.duration_days,
              start_date: d.start_date ? new Date(d.start_date).toISOString() : null,
              end_date: d.end_date ? new Date(d.end_date).toISOString() : null,
              status: d.status
            })),
            createdAt: req.createdAt ? new Date(req.createdAt).toISOString() : null
          };
        })
        .filter(r => r !== null);

      console.log('[getApprovedAdsByCategory] runningInfo:', runningInfo);
      console.log('[getApprovedAdsByCategory] returning approvedAds count:', approvedAds.length);
      return approvedAds;
    } catch (err) {
      console.error('[getApprovedAdsByCategory] error:', err);
      throw err;
    }
  },

  getAdRequestsForApproval: authenticate(["admin"])(async (_, { status }, { models, req }) => {
    try {
      const query = {};
      // Only filter by status if it's provided and not 'all'
      if (status && status !== 'all') {
        query.status = status;
      }

      // Fetch requests with seller and category details
      const requests = await models.CategoryRequest.find(query)
        .populate('seller_id', 'first_name last_name email')
        .populate('category_id', 'name')
        .populate('tier_id', '_id')
        .lean()
        .sort({ createdAt: -1 });

      if (!requests || requests.length === 0) {
        return [];
      }

      // Get request IDs for batch queries
      const requestIds = requests.map(r => r._id);
      const allMedias = await models.CategoryRequestMedia.find({
        category_request_id: { $in: requestIds }
      }).lean();

      const allDurations = await models.CategoryRequestDuration.find({
        category_request_id: { $in: requestIds }
      }).lean();

      // Create maps for fast lookup
      const mediasMap = {};
      const durationsMap = {};

      allMedias.forEach(m => {
        const key = m.category_request_id.toString();
        if (!mediasMap[key]) mediasMap[key] = [];
        mediasMap[key].push(m);
      });

      allDurations.forEach(d => {
        const key = d.category_request_id.toString();
        if (!durationsMap[key]) durationsMap[key] = [];
        durationsMap[key].push(d);
      });

      // Build approval requests with seller info
      const approvalRequests = requests
        .map(req => {
          const reqId = req._id.toString();
          const sellerName = req.seller_id
            ? `${req.seller_id.first_name || ''} ${req.seller_id.last_name || ''}`.trim()
            : 'Unknown Seller';

          // Get tier_id from populated object
          let tierId = req.tier_id;
          if (tierId && typeof tierId === 'object') {
            tierId = tierId._id || tierId;
          }
          tierId = tierId ? tierId.toString() : null;

          // Skip if no tier_id (non-nullable field)
          if (!tierId) return null;

          return {
            id: reqId,
            seller_id: req.seller_id?._id?.toString(),
            sellerName,
            sellerEmail: req.seller_id?.email || 'N/A',
            category_id: req.category_id?._id?.toString(),
            categoryName: req.category_id?.name || 'Unknown',
            tier_id: tierId,
            status: req.status,
            medias: (mediasMap[reqId] || []).map(m => ({
              id: m._id?.toString(),
              slot: m.slot,
              media_type: m.media_type,
              mobile_image_url: m.mobile_image_url,
              desktop_image_url: m.desktop_image_url,
              mobile_redirect_url: m.mobile_redirect_url,
              desktop_redirect_url: m.desktop_redirect_url
            })),
            durations: (durationsMap[reqId] || []).map(d => ({
              id: d._id?.toString(),
              slot: d.slot,
              duration_days: d.duration_days,
              start_date: d.start_date ? new Date(d.start_date).toISOString() : null,
              end_date: d.end_date ? new Date(d.end_date).toISOString() : null,
              status: d.status
            })),
            createdAt: req.createdAt ? new Date(req.createdAt).toISOString() : null,
            updatedAt: req.updatedAt ? new Date(req.updatedAt).toISOString() : null
          };
        })
        .filter(r => r !== null);

      return approvalRequests;
    } catch (err) {
      console.error('[getAdRequestsForApproval] error:', err);
      throw err;
    }
  }),

  // Get banner ads (global, for home page top)
  getBannerAds: async (_, __, { models }) => {
    try {
      // Find all approved requests with banner slots
      const approvedRequests = await models.CategoryRequest.find({
        status: 'approved'
      })
        .populate('seller_id', 'first_name last_name email')
        .populate('category_id', 'name')
        .lean()
        .sort({ createdAt: -1 });

      if (!approvedRequests || approvedRequests.length === 0) {
        return [];
      }

      // Batch fetch medias and durations
      const requestIds = approvedRequests.map(r => r._id);
      const allMedias = await models.CategoryRequestMedia.find({
        category_request_id: { $in: requestIds },
        slot: { $regex: '^banner_' } // Match banner_1, banner_2, banner_3, banner_4
      }).lean();

      const allDurations = await models.CategoryRequestDuration.find({
        category_request_id: { $in: requestIds },
        slot: { $regex: '^banner_' }
      }).lean();

      // Create maps for fast lookup
      const mediasMap = {};
      const durationsMap = {};

      allMedias.forEach(m => {
        const key = m.category_request_id.toString();
        if (!mediasMap[key]) mediasMap[key] = [];
        mediasMap[key].push(m);
      });

      allDurations.forEach(d => {
        const key = d.category_request_id.toString();
        if (!durationsMap[key]) durationsMap[key] = [];
        durationsMap[key].push(d);
      });

      // Build banner ads with seller info
      const bannerAds = approvedRequests
        .map(req => {
          const reqId = req._id.toString();
          const medias = mediasMap[reqId] || [];

          if (!medias || medias.length === 0) return null;

          const sellerName = req.seller_id
            ? `${req.seller_id.first_name || ''} ${req.seller_id.last_name || ''}`.trim()
            : 'Unknown Seller';

          // Check if ad is still running (within start and end dates)
          const durations = durationsMap[reqId] || [];
          const now = new Date();
          const isRunning = durations.some(d => {
            const startDate = d.start_date ? new Date(d.start_date) : null;
            const endDate = d.end_date ? new Date(d.end_date) : null;
            return startDate && endDate && now >= startDate && now <= endDate;
          });

          // Only return if ad is running
          if (!isRunning) return null;

          return {
            id: reqId,
            sellerName,
            sellerEmail: req.seller_id?.email || 'N/A',
            categoryId: req.category_id?._id?.toString(),
            categoryName: req.category_id?.name || 'Unknown',
            medias: medias.map(m => ({
              id: m._id?.toString(),
              slot: m.slot,
              media_type: m.media_type,
              mobile_image_url: m.mobile_image_url,
              desktop_image_url: m.desktop_image_url,
              mobile_redirect_url: m.mobile_redirect_url,
              desktop_redirect_url: m.desktop_redirect_url
            })),
            durations: (durationsMap[reqId] || []).map(d => ({
              id: d._id?.toString(),
              slot: d.slot,
              duration_days: d.duration_days,
              start_date: d.start_date ? new Date(d.start_date).toISOString() : null,
              end_date: d.end_date ? new Date(d.end_date).toISOString() : null,
              status: d.status
            })),
            createdAt: req.createdAt ? new Date(req.createdAt).toISOString() : null
          };
        })
        .filter(r => r !== null);

      return bannerAds;
    } catch (err) {
      console.error('[getBannerAds] error:', err);
      throw err;
    }
  },

  // Get stamp ads (global, for home page bottom)
  getStampAds: async (_, __, { models }) => {
    try {
      // Find all approved requests with stamp slots
      const approvedRequests = await models.CategoryRequest.find({
        status: 'approved'
      })
        .populate('seller_id', 'first_name last_name email')
        .populate('category_id', 'name')
        .lean()
        .sort({ createdAt: -1 });

      if (!approvedRequests || approvedRequests.length === 0) {
        return [];
      }

      // Batch fetch medias and durations
      const requestIds = approvedRequests.map(r => r._id);
      const allMedias = await models.CategoryRequestMedia.find({
        category_request_id: { $in: requestIds },
        slot: { $regex: '^stamp_' } // Match stamp_1, stamp_2, stamp_3, stamp_4
      }).lean();

      const allDurations = await models.CategoryRequestDuration.find({
        category_request_id: { $in: requestIds },
        slot: { $regex: '^stamp_' }
      }).lean();

      // Create maps for fast lookup
      const mediasMap = {};
      const durationsMap = {};

      allMedias.forEach(m => {
        const key = m.category_request_id.toString();
        if (!mediasMap[key]) mediasMap[key] = [];
        mediasMap[key].push(m);
      });

      allDurations.forEach(d => {
        const key = d.category_request_id.toString();
        if (!durationsMap[key]) durationsMap[key] = [];
        durationsMap[key].push(d);
      });

      // Build stamp ads with seller info
      const stampAds = approvedRequests
        .map(req => {
          const reqId = req._id.toString();
          const medias = mediasMap[reqId] || [];

          if (!medias || medias.length === 0) return null;

          const sellerName = req.seller_id
            ? `${req.seller_id.first_name || ''} ${req.seller_id.last_name || ''}`.trim()
            : 'Unknown Seller';

          // Check if ad is still running (within start and end dates)
          const durations = durationsMap[reqId] || [];
          const now = new Date();
          const isRunning = durations.some(d => {
            const startDate = d.start_date ? new Date(d.start_date) : null;
            const endDate = d.end_date ? new Date(d.end_date) : null;
            return startDate && endDate && now >= startDate && now <= endDate;
          });

          // Only return if ad is running
          if (!isRunning) return null;

          return {
            id: reqId,
            sellerName,
            sellerEmail: req.seller_id?.email || 'N/A',
            categoryId: req.category_id?._id?.toString(),
            categoryName: req.category_id?.name || 'Unknown',
            medias: medias.map(m => ({
              id: m._id?.toString(),
              slot: m.slot,
              media_type: m.media_type,
              mobile_image_url: m.mobile_image_url,
              desktop_image_url: m.desktop_image_url,
              mobile_redirect_url: m.mobile_redirect_url,
              desktop_redirect_url: m.desktop_redirect_url
            })),
            durations: (durationsMap[reqId] || []).map(d => ({
              id: d._id?.toString(),
              slot: d.slot,
              duration_days: d.duration_days,
              start_date: d.start_date ? new Date(d.start_date).toISOString() : null,
              end_date: d.end_date ? new Date(d.end_date).toISOString() : null,
              status: d.status
            })),
            createdAt: req.createdAt ? new Date(req.createdAt).toISOString() : null
          };
        })
        .filter(r => r !== null);

      return stampAds;
    } catch (err) {
      console.error('[getStampAds] error:', err);
      throw err;
    }
  }
};

export const Mutation = {
  createCategoryRequest: authenticate(["seller"])(
    async (_, { input }, { models, req }) => {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        // Extract seller ID from JWT token (not from input for security)
        const authHeader = req.headers.authorization;
        if (!authHeader) throw new Error('Authorization header missing');

        const token = authHeader.split(' ')[1];
        if (!token) throw new Error('Token missing');

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const sellerId = decoded._id;

        console.log('[createCategoryRequest] Input received:', JSON.stringify(input, null, 2));
        console.log('[createCategoryRequest] Seller ID from JWT:', sellerId);

        // Verify category exists and get tier info
        const category = await models.Category.findById(input.category_id).populate('adTierId');
        if (!category) throw new Error('Category not found');
        if (!category.adTierId) throw new Error('Category not mapped to a tier');

        console.log('[createCategoryRequest] Category found:', category._id);

        // Check slot availability for this category (8 slots per category)
        // Find all requests for this category
        const requestsForCategory = await models.CategoryRequest.find({ category_id: input.category_id }).select('_id').lean();
        const requestIdsForCategory = requestsForCategory.map(r => r._id);
        const bookedCount = requestIdsForCategory.length > 0
          ? await models.CategoryRequestDuration.countDocuments({
            category_request_id: { $in: requestIdsForCategory },
            status: { $in: ['running', 'approved'] }
          })
          : 0;

        if (bookedCount >= 8) throw new Error('No slots available for this category');

        console.log('[createCategoryRequest] Booked slots for category:', bookedCount, '/ 8');

        // Create category request
        const req_obj = await models.CategoryRequest.create(
          [{
            seller_id: sellerId,
            category_id: input.category_id,
            tier_id: category.adTierId._id,
            status: 'pending'
          }],
          { session }
        );

        console.log('[createCategoryRequest] CategoryRequest created:', req_obj[0]._id);

        // Create media entries for each uploaded file/slot
        const medias = input.medias.map(m => ({
          category_request_id: req_obj[0]._id,
          slot: m.slot,
          media_type: m.media_type,
          mobile_image_url: m.mobile_image_url,
          mobile_redirect_url: m.mobile_redirect_url,
          desktop_image_url: m.desktop_image_url,
          desktop_redirect_url: m.desktop_redirect_url
        }));

        const savedMedias = await models.CategoryRequestMedia.insertMany(medias, { session });
        console.log('[createCategoryRequest] Media entries created:', savedMedias.length);

        // Create duration entries for each media slot
        const durations = input.medias.map(m => ({
          category_request_id: req_obj[0]._id,
          slot: m.slot,
          duration_days: input.duration_days || 30,
          status: 'pending',
          start_date: null,
          end_date: null
        }));

        const savedDurations = await models.CategoryRequestDuration.insertMany(durations, { session });
        console.log('[createCategoryRequest] Duration entries created:', savedDurations.length);

        await session.commitTransaction();
        session.endSession();

        console.log('[createCategoryRequest] Transaction committed successfully');
        return req_obj[0];
      } catch (err) {
        console.error('[createCategoryRequest] ERROR:', err.message, err.stack);
        await session.abortTransaction();
        session.endSession();
        throw new Error('Failed to create category request: ' + err.message);
      }
    }
  ),

  approveCategoryRequest: async (_, { id, slot, start_date, end_date, duration_days }, { models }) => {
    const durationDoc = await models.CategoryRequestDuration.findOneAndUpdate(
      { category_request_id: id, slot },
      {
        $set: {
          start_date: new Date(start_date),
          end_date: new Date(end_date),
          duration_days,
          status: 'running'
        }
      },
      { new: true }
    );

    // Check if all slots for this request are approved; if so, update request status
    const pendingSlots = await models.CategoryRequestDuration.countDocuments({
      category_request_id: id,
      status: 'pending'
    });
    if (pendingSlots === 0) {
      await models.CategoryRequest.findByIdAndUpdate(id, { $set: { status: 'running' } });
    }

    return durationDoc;
  },

  rejectCategoryRequest: async (_, { id }, { models }) => {
    const updated = await models.CategoryRequest.findByIdAndUpdate(id, { $set: { status: 'rejected' } }, { new: true });
    return updated;
  },

  // Admin approve ad request
  approveAdRequest: authenticate(["admin"])(async (_, { input }, { models, req }) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { requestId, start_date } = input;

      // Extract admin ID from JWT
      const authHeader = req.headers.authorization;
      if (!authHeader) throw new Error('Authorization header missing');

      const token = authHeader.split(' ')[1];
      if (!token) throw new Error('Token missing');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const adminId = decoded._id;

      console.log('[approveAdRequest] Admin:', adminId, 'Request:', requestId);

      // Find the request
      const categoryRequest = await models.CategoryRequest.findById(requestId);
      if (!categoryRequest) throw new Error('Ad request not found');
      if (categoryRequest.status !== 'pending') throw new Error('Request is not in pending status');

      // Get duration_days from any duration record
      const durationRecord = await models.CategoryRequestDuration.findOne({
        category_request_id: requestId
      });

      if (!durationRecord) throw new Error('Duration records not found');

      const duration_days = durationRecord.duration_days || 30;
      const startDate = new Date(start_date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration_days);

      console.log('[approveAdRequest] Start:', startDate, 'End:', endDate, 'Duration:', duration_days);

      // Update all duration records for this request
      await models.CategoryRequestDuration.updateMany(
        { category_request_id: requestId },
        {
          $set: {
            start_date: startDate,
            end_date: endDate,
            status: 'approved'
          }
        },
        { session }
      );

      // Update category request status
      const updatedRequest = await models.CategoryRequest.findByIdAndUpdate(
        requestId,
        {
          $set: {
            status: 'approved',
            approved_by: adminId,
            approved_date: new Date()
          }
        },
        { new: true, session }
      );

      await session.commitTransaction();
      session.endSession();

      console.log('[approveAdRequest] Approved successfully');

      return {
        success: true,
        message: 'Ad request approved successfully',
        data: updatedRequest
      };
    } catch (err) {
      console.error('[approveAdRequest] ERROR:', err.message);
      await session.abortTransaction();
      session.endSession();
      throw new Error('Failed to approve request: ' + err.message);
    }
  }),

  // Admin reject ad request
  rejectAdRequest: authenticate(["admin"])(async (_, { input }, { models, req }) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { requestId, rejection_reason } = input;

      // Extract admin ID from JWT
      const authHeader = req.headers.authorization;
      if (!authHeader) throw new Error('Authorization header missing');

      const token = authHeader.split(' ')[1];
      if (!token) throw new Error('Token missing');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const adminId = decoded._id;

      console.log('[rejectAdRequest] Admin:', adminId, 'Request:', requestId);

      // Find the request
      const categoryRequest = await models.CategoryRequest.findById(requestId);
      if (!categoryRequest) throw new Error('Ad request not found');
      if (categoryRequest.status !== 'pending') throw new Error('Request is not in pending status');

      // Update all duration records for this request
      await models.CategoryRequestDuration.updateMany(
        { category_request_id: requestId },
        {
          $set: { status: 'rejected' }
        },
        { session }
      );

      // Update category request status
      const updatedRequest = await models.CategoryRequest.findByIdAndUpdate(
        requestId,
        {
          $set: {
            status: 'rejected',
            approved_by: adminId,
            approved_date: new Date(),
            rejection_reason: rejection_reason || null
          }
        },
        { new: true, session }
      );

      await session.commitTransaction();
      session.endSession();

      console.log('[rejectAdRequest] Rejected successfully');

      return {
        success: true,
        message: 'Ad request rejected successfully',
        data: updatedRequest
      };
    } catch (err) {
      console.error('[rejectAdRequest] ERROR:', err.message);
      await session.abortTransaction();
      session.endSession();
      throw new Error('Failed to reject request: ' + err.message);
    }
  })
};

export default { Query, Mutation };
