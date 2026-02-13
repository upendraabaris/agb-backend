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

      // Fetch booked slots count ONCE instead of per category (N+1 optimization)
      const bookedCount = await models.CategoryRequestDuration.countDocuments({
        status: { $in: ['running', 'approved'] }
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
        const availableSlots = Math.max(0, 8 - bookedCount);
        
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
          bookedSlots: bookedCount
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

        // Check slot availability for this tier
        const bookedCount = await models.CategoryRequestDuration.countDocuments({
          status: { $in: ['running', 'approved'] }
        });
        if (bookedCount >= 8) throw new Error('No slots available for this tier');

        console.log('[createCategoryRequest] Booked slots:', bookedCount, '/ 8');

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
  }
};

export default { Query, Mutation };
