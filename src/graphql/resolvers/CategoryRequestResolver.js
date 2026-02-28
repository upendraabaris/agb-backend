import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import authenticate from '../../middlewares/auth.js';
import AdPricingConfig from '../../models/AdPricingConfig.js';

// Build full image URL from relative path (e.g. "uploads/img.jpg" → "http://localhost:4000/uploads/img.jpg")
const getFullImageUrl = (relativePath) => {
  if (!relativePath) return '';
  if (relativePath.startsWith('http') || relativePath.startsWith('data:')) return relativePath;
  const base = (process.env.BASE_URL || 'http://localhost:4000/uploads/').replace(/\/$/, '');
  const cleanPath = relativePath.replace(/^uploads\//, '');
  return `${base}/${cleanPath}`;
};

// ─── HELPER: Get next 4 quarters starting from current quarter ──────────────
const getNext4Quarters = () => {
  const now = new Date();
  const currentMonth = now.getUTCMonth(); // 0-based
  const currentYear = now.getUTCFullYear();

  // Find current quarter start month
  let qStartMonth;
  if (currentMonth <= 2) qStartMonth = 0;       // Q1: Jan
  else if (currentMonth <= 5) qStartMonth = 3;   // Q2: Apr
  else if (currentMonth <= 8) qStartMonth = 6;   // Q3: Jul
  else qStartMonth = 9;                           // Q4: Oct

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const quarters = [];
  let month = qStartMonth;
  let year = currentYear;

  for (let i = 0; i < 4; i++) {
    const qNum = Math.floor(month / 3) + 1;
    const startDate = new Date(Date.UTC(year, month, 1));
    let endDate;
    if (month === 0) endDate = new Date(Date.UTC(year, 2, 31, 23, 59, 59, 999));
    else if (month === 3) endDate = new Date(Date.UTC(year, 5, 30, 23, 59, 59, 999));
    else if (month === 6) endDate = new Date(Date.UTC(year, 8, 30, 23, 59, 59, 999));
    else endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const label = `${monthNames[month]} - ${monthNames[month + 2]} ${year}`;
    quarters.push({ quarter: `Q${qNum} ${year}`, label, startDate, endDate });

    month += 3;
    if (month >= 12) { month = 0; year++; }
  }
  return quarters;
};

// ─── HELPER: Get slot price from AdPricingConfig ────────────────────────────
// durationKey: 'quarterly' | 'half_yearly' | 'yearly'
const getSlotPriceFromConfig = async (tierId, slotName, durationKey = 'quarterly') => {
  const config = await AdPricingConfig.findOne({ tier_id: tierId, is_active: true }).lean();
  if (!config || !config.generated_prices) return null;
  const slotPrice = config.generated_prices.find(p => p.slot_name === slotName);
  if (!slotPrice) return null;
  return slotPrice[durationKey] || 0;
};

// ─── HELPER: Map duration_type to days and config key ───────────────────────
const DURATION_MAP = {
  quarterly:   { days: 90,  quarters: 1, configKey: 'quarterly' },
  half_yearly: { days: 180, quarters: 2, configKey: 'half_yearly' },
  yearly:      { days: 360, quarters: 4, configKey: 'yearly' },
};

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
              mobile_image_url: getFullImageUrl(m.mobile_image_url),
              desktop_image_url: getFullImageUrl(m.desktop_image_url),
              redirect_url: m.redirect_url,
              url_type: m.url_type
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
      // include start_date + end_date so we can compute quarter-level availability
      const allDurations = await models.CategoryRequestDuration.find({
        status: { $in: ['running', 'approved'] }
      }).select('category_request_id slot start_date end_date').lean();

      // Pre-compute next 4 quarters (same for all categories)
      const next4Quarters = getNext4Quarters();

      // Build maps for fast lookup per category
      const requestsByCategory = {};
      allRequests.forEach(req => {
        const catId = req.category_id.toString();
        if (!requestsByCategory[catId]) requestsByCategory[catId] = [];
        requestsByCategory[catId].push(req._id.toString());
      });

      // map categories asynchronously so we can await pricing lookup
      const result = await Promise.all(categories.map(async cat => {
        if (!cat.adTierId) {
          // still provide slotStatuses array so UI can render consistently
          const slotNames = ['banner_1', 'banner_2', 'banner_3', 'banner_4', 'stamp_1', 'stamp_2', 'stamp_3', 'stamp_4'];
          const defaultStatuses = slotNames.map((s) => ({ slot: s, available: true, freeDate: null }));
          return {
            id: cat._id?.toString(),
            name: cat.name || 'Unknown',
            image: cat.image || null,
            description: cat.description || '',
            order: cat.order || 0,
            adTierId: null,
            parent: cat.parent?.toString() || null,
            tierId: null,
            availableSlots: 8,
            bookedSlots: 0,
            slotStatuses: defaultStatuses
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
        // group durations for slots in this category
        const slotStatuses = slotNames.map(slotName => {
          const matches = allDurations.filter(d =>
            requestIdsForCat.includes(d.category_request_id.toString()) &&
            d.slot === slotName
          );
          if (matches.length === 0) {
            return { slot: slotName, available: true, freeDate: null };
          }
          // if there are booked entries, take the latest end_date
          let latestEnd = null;
          matches.forEach(d => {
            if (d.end_date) {
              const ed = new Date(d.end_date);
              if (!latestEnd || ed > latestEnd) latestEnd = ed;
            }
          });
          return {
            slot: slotName,
            available: false,
            freeDate: latestEnd ? latestEnd.toISOString() : null
          };
        });

        // ── Pricing from AdPricingConfig (replaces old AdCategory lookup) ──
        let pricing90 = [];
        try {
          const pricingConfig = await AdPricingConfig.findOne({ tier_id: tierId, is_active: true }).lean();
          if (pricingConfig && pricingConfig.generated_prices) {
            const banner1 = pricingConfig.generated_prices.find(p => p.slot_name === 'banner_1');
            const stamp1 = pricingConfig.generated_prices.find(p => p.slot_name === 'stamp_1');
            if (banner1) {
              pricing90.push({ id: pricingConfig._id?.toString() + '_banner', ad_type: 'banner', price: banner1.quarterly, priority: 1, duration_days: 90 });
            }
            if (stamp1) {
              pricing90.push({ id: pricingConfig._id?.toString() + '_stamp', ad_type: 'stamp', price: stamp1.quarterly, priority: 2, duration_days: 90 });
            }
          }
        } catch (e) {
          console.error('[CategoryRequestResolver] pricing90 load error', e);
        }

        // ── Quarter Availability: next 4 quarters with per-slot status ──
        const quarterAvailability = next4Quarters.map(q => {
          const slots = slotNames.map(slotName => {
            // A slot is booked in this quarter if any duration overlaps the quarter window
            const isBooked = allDurations.some(d =>
              requestIdsForCat.includes(d.category_request_id.toString()) &&
              d.slot === slotName &&
              d.start_date && d.end_date &&
              new Date(d.start_date) <= q.endDate &&
              new Date(d.end_date) >= q.startDate
            );
            return { slot: slotName, available: !isBooked };
          });
          return {
            quarter: q.quarter,
            label: q.label,
            startDate: q.startDate.toISOString(),
            endDate: q.endDate.toISOString(),
            slots
          };
        });

        return {
          id: cat._id?.toString(),
          name: cat.name || 'Unknown',
          image: cat.image || null,
          description: cat.description || '',
          order: cat.order || 0,
          adTierId: tierId,
          parent: cat.parent?.toString() || null,
          tierId: {
            id: tierId,
            name: cat.adTierId.name || 'Unknown Tier'
          },
          availableSlots,
          bookedSlots: bookedCount,
          bookedBanner: bookedBannerCount,
          bookedStamp: bookedStampCount,
          slotStatuses: slotStatuses,
          pricing90,
          quarterAvailability
        };
      }));

      return result.filter(cat => cat !== null);
    } catch (err) {
      console.error('[CategoryRequestResolver] getCategoriesWithAvailableSlots error:', err);
      return [];
    }
  },

  // Check whether slots for a given request are free around a proposed start date
  checkSlotAvailability: async (_, { requestId, start_date }, { models }) => {

    try {
      const durations = await models.CategoryRequestDuration.find({ category_request_id: requestId }).lean();
      if (!durations || durations.length === 0) {
        return { available: true, details: [] };
      }

      // Fetch the category_id for this request
      const categoryRequest = await models.CategoryRequest.findById(durations[0].category_request_id).lean();
      const categoryId = categoryRequest?.category_id?.toString();

      // determine candidate startDate using provided value or preference
      let startDate = start_date ? new Date(start_date) : null;
      const pref = durations[0].start_preference || 'today';
      if (!startDate) {
        if (pref === 'next_quarter') {
          const now = new Date();
          const m = now.getUTCMonth();
          const y = now.getUTCFullYear();
          if (m <= 2) startDate = new Date(Date.UTC(y, 3, 1));
          else if (m <= 5) startDate = new Date(Date.UTC(y, 6, 1));
          else if (m <= 8) startDate = new Date(Date.UTC(y, 9, 1));
          else startDate = new Date(Date.UTC(y + 1, 0, 1));
        } else {
          startDate = new Date();
        }
      }

      // helper functions for quarter computation
      const getQuarterLabel = (date) => {
        const m = date.getUTCMonth() + 1;
        const year = date.getUTCFullYear();
        if (m >= 1 && m <= 3) return `Q1 ${year}`;
        if (m >= 4 && m <= 6) return `Q2 ${year}`;
        if (m >= 7 && m <= 9) return `Q3 ${year}`;
        return `Q4 ${year}`;
      };
      const getQuarterEnd = (date) => {
        const m = date.getUTCMonth() + 1;
        const year = date.getUTCFullYear();
        if (m >= 1 && m <= 3) return new Date(Date.UTC(year, 2, 31, 23,59,59,999));
        if (m >= 4 && m <= 6) return new Date(Date.UTC(year, 5, 30, 23,59,59,999));
        if (m >= 7 && m <= 9) return new Date(Date.UTC(year, 8, 30, 23,59,59,999));
        return new Date(Date.UTC(year, 11, 31, 23,59,59,999));
      };
      const addDays = (date, days) => {
        const d = new Date(date);
        d.setUTCDate(d.getUTCDate() + days);
        return d;
      };
      const getNextQuarterStart = (date) => {
        const m = date.getUTCMonth();
        const year = date.getUTCFullYear();
        if (m <= 2) return new Date(Date.UTC(year, 3, 1));
        if (m <= 5) return new Date(Date.UTC(year, 6, 1));
        if (m <= 8) return new Date(Date.UTC(year, 9, 1));
        return new Date(Date.UTC(year + 1, 0, 1));
      };
      const splitIntervalByQuarter = (start, days) => {
        const segments = [];
        // Normalize to UTC midnight
        let current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
        let remaining = days;
        while (remaining > 0) {
          const quarterEnd = getQuarterEnd(current);
          const msPerDay = 24 * 60 * 60 * 1000;
          const diff = Math.floor(
            (Date.UTC(quarterEnd.getUTCFullYear(), quarterEnd.getUTCMonth(), quarterEnd.getUTCDate()) - 
             Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate())) / msPerDay
          ) + 1;
          const take = Math.min(diff, remaining);
          const segmentEnd = addDays(current, take - 1);
          segments.push({ 
            quarter: getQuarterLabel(current), 
            start: new Date(current),
            end: segmentEnd,
            days: take 
          });
          current = addDays(current, take);
          remaining -= take;
        }
        return segments;
      };

      // compute quarters this request will cover based on start preference
      const candidateDays = durations[0]?.duration_days || 30;
      
      let candidateSegments = [];
      if (pref === 'next_quarter') {
        const nextQStart = getNextQuarterStart(startDate);
        candidateSegments = splitIntervalByQuarter(nextQStart, candidateDays);
      } else {
        // Current quarter remaining + full duration from next quarter
        const startUTC = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
        const currentQEnd = getQuarterEnd(startUTC);
        const msPerDay = 24 * 60 * 60 * 1000;
        const remainingInCurrentQ = Math.floor(
          (Date.UTC(currentQEnd.getUTCFullYear(), currentQEnd.getUTCMonth(), currentQEnd.getUTCDate()) - 
           Date.UTC(startUTC.getUTCFullYear(), startUTC.getUTCMonth(), startUTC.getUTCDate())) / msPerDay
        ) + 1;
        
        candidateSegments.push({
          quarter: getQuarterLabel(startUTC),
          start: new Date(startUTC),
          end: currentQEnd,
          days: remainingInCurrentQ
        });
        
        const nextQStart = getNextQuarterStart(startUTC);
        const nextQSegs = splitIntervalByQuarter(nextQStart, candidateDays);
        candidateSegments.push(...nextQSegs);
      }
      
      const candidateQuarters = candidateSegments.map(s => s.quarter);
      const totalCandidateDays = candidateSegments.reduce((sum, s) => sum + s.days, 0);
      const candidateEndDate = candidateSegments[candidateSegments.length - 1]?.end || startDate;
      console.log('[checkSlotAvailability] Candidate quarters:', candidateQuarters, 'Total days:', totalCandidateDays);

      const details = [];
      let overallAvailable = true;

      for (const dur of durations) {

        // Only check for conflicts within the same category
        const conflict = await models.CategoryRequestDuration.findOne({
          slot: dur.slot,
          category_request_id: { $ne: requestId },
          status: { $in: ['running', 'approved'] },
          quarters_covered: { $in: candidateQuarters },
        }).lean();

        // Fetch the category_id for the conflicting duration's request
        let isSameCategory = false;
        if (conflict) {
          const conflictRequest = await models.CategoryRequest.findById(conflict.category_request_id).lean();
          if (conflictRequest && conflictRequest.category_id?.toString() === categoryId) {
            isSameCategory = true;
          }
        }

        // Only declare hasConflict once
        const hasSlotConflict = !!conflict && isSameCategory;
        if (hasSlotConflict) overallAvailable = false;
        details.push({
          slot: dur.slot,
          startDate: startDate.toISOString(),
          endDate: candidateEndDate.toISOString(),
          conflict: hasSlotConflict,
          conflictId: (hasSlotConflict && conflict?._id?.toString()) || null,
          conflictQuarters: (hasSlotConflict && conflict?.quarters_covered?.join(',')) || null
        });

        // ...handled above
      }

      return { available: overallAvailable, details };
    } catch (e) {
      console.error('[checkSlotAvailability] error', e);
      return { available: false, details: [] };
    }
  },

  // Get pricing for a category by tier (sourced from AdPricingConfig)
  getCategoryPricing: async (_, { categoryId }, { models }) => {
    try {
      const category = await models.Category.findById(categoryId).populate('adTierId').lean();
      if (!category || !category.adTierId) return null;

      const tierId = category.adTierId._id;
      const tierName = category.adTierId.name || 'Unknown Tier';

      // Fetch pricing from AdPricingConfig
      const pricingConfig = await AdPricingConfig.findOne({ tier_id: tierId, is_active: true }).lean();
      if (!pricingConfig || !pricingConfig.generated_prices) {
        return { categoryId, tierId: tierId.toString(), tierName, adCategories: [] };
      }

      // Generate per-slot pricing entries from AdPricingConfig (all 8 slots × 3 durations = 24 entries)
      const configId = pricingConfig._id?.toString();
      const adCategories = [];
      pricingConfig.generated_prices.forEach(gp => {
        const priority = gp.ad_type === 'banner' ? gp.slot_position : gp.slot_position + 4;
        adCategories.push(
          { id: `${configId}_${gp.slot_name}_q`, ad_type: gp.ad_type, slot_name: gp.slot_name, slot_position: gp.slot_position, price: gp.quarterly,    priority, duration_days: 90 },
          { id: `${configId}_${gp.slot_name}_h`, ad_type: gp.ad_type, slot_name: gp.slot_name, slot_position: gp.slot_position, price: gp.half_yearly,  priority, duration_days: 180 },
          { id: `${configId}_${gp.slot_name}_y`, ad_type: gp.ad_type, slot_name: gp.slot_name, slot_position: gp.slot_position, price: gp.yearly,       priority, duration_days: 360 }
        );
      });

      return { categoryId, tierId: tierId.toString(), tierName, adCategories };
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
              mobile_image_url: getFullImageUrl(m.mobile_image_url),
              desktop_image_url: getFullImageUrl(m.desktop_image_url),
              redirect_url: m.redirect_url,
              url_type: m.url_type
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
              mobile_image_url: getFullImageUrl(m.mobile_image_url),
              desktop_image_url: getFullImageUrl(m.desktop_image_url),
              redirect_url: m.redirect_url,
              url_type: m.url_type
            })),
            durations: (durationsMap[reqId] || []).map(d => ({
              id: d._id?.toString(),
              slot: d.slot,
              duration_days: d.duration_days,
              start_date: d.start_date ? new Date(d.start_date).toISOString() : null,
              end_date: d.end_date ? new Date(d.end_date).toISOString() : null,
              status: d.status,
              start_preference: d.start_preference,
              quarters_covered: d.quarters_covered || [],
              pricing_breakdown: (d.pricing_breakdown || []).map(b => ({
                quarter: b.quarter,
                start: b.start ? new Date(b.start).toISOString() : null,
                end: b.end ? new Date(b.end).toISOString() : null,
                days: b.days,
                rate_per_day: b.rate_per_day,
                subtotal: b.subtotal
              })),
              total_price: d.total_price || 0
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
              mobile_image_url: getFullImageUrl(m.mobile_image_url),
              desktop_image_url: getFullImageUrl(m.desktop_image_url),
              redirect_url: m.redirect_url,
              url_type: m.url_type
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
              mobile_image_url: getFullImageUrl(m.mobile_image_url),
              desktop_image_url: getFullImageUrl(m.desktop_image_url),
              redirect_url: m.redirect_url,
              url_type: m.url_type
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
          desktop_image_url: m.desktop_image_url,
          redirect_url: m.redirect_url,
          url_type: m.url_type || 'external'
        }));

        const savedMedias = await models.CategoryRequestMedia.insertMany(medias, { session });
        console.log('[createCategoryRequest] Media entries created:', savedMedias.length);

        // ─── Quarter boundary helpers ─────────────────────────────────
        const getNextQuarterStart = (date) => {
          const m = date.getUTCMonth();
          const year = date.getUTCFullYear();
          if (m <= 2) return new Date(Date.UTC(year, 3, 1));
          if (m <= 5) return new Date(Date.UTC(year, 6, 1));
          if (m <= 8) return new Date(Date.UTC(year, 9, 1));
          return new Date(Date.UTC(year + 1, 0, 1));
        };
        const getQuarterLabel = (date) => {
          const m = date.getUTCMonth() + 1;
          const year = date.getUTCFullYear();
          if (m >= 1 && m <= 3) return `Q1 ${year}`;
          if (m >= 4 && m <= 6) return `Q2 ${year}`;
          if (m >= 7 && m <= 9) return `Q3 ${year}`;
          return `Q4 ${year}`;
        };
        const getQuarterEnd = (date) => {
          const m = date.getUTCMonth() + 1;
          const year = date.getUTCFullYear();
          if (m >= 1 && m <= 3) return new Date(Date.UTC(year, 2, 31, 23,59,59,999));
          if (m >= 4 && m <= 6) return new Date(Date.UTC(year, 5, 30, 23,59,59,999));
          if (m >= 7 && m <= 9) return new Date(Date.UTC(year, 8, 30, 23,59,59,999));
          return new Date(Date.UTC(year, 11, 31, 23,59,59,999));
        };
        const addQuarters = (startDate, numQuarters) => {
          // Returns the end of the Nth quarter from startDate
          let d = new Date(startDate);
          for (let i = 0; i < numQuarters; i++) {
            d = new Date(getNextQuarterStart(d));
          }
          return getQuarterEnd(d); // end of that quarter
        };

        // ─── Pricing from AdPricingConfig ─────────────────────────────
        const tierId = category.adTierId._id;
        const pricingConfig = await AdPricingConfig.findOne({ tier_id: tierId, is_active: true }).lean();
        if (!pricingConfig || !pricingConfig.generated_prices) {
          throw new Error('No pricing config found for this tier. Please contact admin.');
        }
        console.log('[createCategoryRequest] AdPricingConfig loaded for tier:', tierId);

        // ─── Duration / date calculation ──────────────────────────────
        const today = new Date();
        const startPref = input.start_preference || 'today';
        const startQuarterDate = input.start_quarter ? new Date(input.start_quarter) : null;
        // Support both old duration_days and new duration_type
        const durationType = input.duration_type || null;
        const durInfo = durationType ? DURATION_MAP[durationType] : null;
        const numQuarters = durInfo ? durInfo.quarters : (input.duration_days === 360 ? 4 : input.duration_days === 180 ? 2 : 1);
        const configKey = durInfo ? durInfo.configKey : (input.duration_days === 360 ? 'yearly' : input.duration_days === 180 ? 'half_yearly' : 'quarterly');

        // Create duration entries for each selected slot
        const durations = await Promise.all(input.medias.map(async (m) => {
          // Get exact slot price from config (position-aware)
          const slotPriceEntry = pricingConfig.generated_prices.find(p => p.slot_name === m.slot);
          if (!slotPriceEntry) {
            throw new Error(`Pricing not found for slot ${m.slot}`);
          }
          const slotPrice = slotPriceEntry[configKey] || 0;

          let durStart, durEnd;
          const segments = [];
          let proRataCharge = 0;

          if (startPref !== 'today') {
            // Quarter mode: start from specific quarter or next quarter
            durStart = startQuarterDate || getNextQuarterStart(today);
            let cursor = new Date(durStart);
            for (let i = 0; i < numQuarters; i++) {
              const qEnd = getQuarterEnd(cursor);
              segments.push({
                quarter: getQuarterLabel(cursor),
                start: new Date(cursor),
                end: qEnd,
                days: Math.floor((qEnd - cursor) / (24*60*60*1000)) + 1
              });
              cursor = getNextQuarterStart(cursor);
            }
            durEnd = segments[segments.length - 1].end;
          } else {
            // Today mode: current quarter remaining days charged pro-rata,
            // then N full quarters from next quarter at full selected duration price
            const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
            const currentQEnd = getQuarterEnd(todayUTC);
            const remainingDays = Math.floor((currentQEnd - todayUTC) / (24*60*60*1000)) + 1;

            // Full quarter length for pro-rata calculation
            const qStartMonth = Math.floor(todayUTC.getUTCMonth() / 3) * 3;
            const currentQStart = new Date(Date.UTC(todayUTC.getUTCFullYear(), qStartMonth, 1));
            const fullQuarterDays = Math.floor((currentQEnd - currentQStart) / (24*60*60*1000)) + 1;

            // Pro-rata charge = (remaining / full) × quarterly price for this slot
            const quarterlySlotPrice = slotPriceEntry.quarterly || 0;
            proRataCharge = Math.round((remainingDays / fullQuarterDays) * quarterlySlotPrice);

            segments.push({
              quarter: getQuarterLabel(todayUTC),
              start: new Date(todayUTC),
              end: currentQEnd,
              days: remainingDays
            });
            durStart = todayUTC;

            // Then N full quarters from next quarter
            let cursor = getNextQuarterStart(todayUTC);
            for (let i = 0; i < numQuarters; i++) {
              const qEnd = getQuarterEnd(cursor);
              segments.push({
                quarter: getQuarterLabel(cursor),
                start: new Date(cursor),
                end: qEnd,
                days: Math.floor((qEnd - cursor) / (24*60*60*1000)) + 1
              });
              cursor = getNextQuarterStart(cursor);
            }
            durEnd = segments[segments.length - 1].end;
          }

          // Total = full duration price + pro-rata for current quarter (0 for next_quarter mode)
          const finalPrice = slotPrice + proRataCharge;
          const totalDays = segments.reduce((sum, s) => sum + s.days, 0);

          // Build breakdown with accurate per-segment subtotals
          let breakdown;
          if (proRataCharge > 0 && segments.length > 1) {
            // Today mode: first segment is pro-rata, rest are paid quarters
            const proRataSeg = segments[0];
            const paidSegs = segments.slice(1);
            const paidTotalDays = paidSegs.reduce((sum, s) => sum + s.days, 0);
            const proRataRate = Math.round((proRataCharge / proRataSeg.days) * 100) / 100;
            const paidRate = Math.round((slotPrice / paidTotalDays) * 100) / 100;

            breakdown = [
              { quarter: proRataSeg.quarter, start: proRataSeg.start.toISOString(), end: proRataSeg.end.toISOString(), days: proRataSeg.days, rate_per_day: proRataRate, subtotal: proRataCharge },
              ...paidSegs.map(s => ({
                quarter: s.quarter, start: s.start.toISOString(), end: s.end.toISOString(), days: s.days,
                rate_per_day: paidRate,
                subtotal: Math.round((s.days / paidTotalDays) * slotPrice)
              }))
            ];
          } else {
            // Next quarter mode: uniform rate across all segments
            const ratePerDay = Math.round((finalPrice / totalDays) * 100) / 100;
            breakdown = segments.map(s => ({
              quarter: s.quarter, start: s.start.toISOString(), end: s.end.toISOString(), days: s.days,
              rate_per_day: ratePerDay,
              subtotal: Math.round(ratePerDay * s.days)
            }));
          }

          const quarters = [...new Set(segments.map(s => s.quarter))];

          return {
            category_request_id: req_obj[0]._id,
            slot: m.slot,
            duration_days: totalDays,
            status: 'pending',
            start_date: durStart,
            end_date: durEnd,
            start_preference: startPref,
            quarters_covered: quarters,
            pricing_breakdown: breakdown,
            total_price: finalPrice
          };
        }));

        console.log('[createCategoryRequest] Duration data to save:', JSON.stringify(durations, null, 2));

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
      const { requestId } = input;

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

      // Update all durations status to 'approved'
      await models.CategoryRequestDuration.updateMany(
        { category_request_id: requestId },
        { $set: { status: 'approved' } },
        { session }
      );

      console.log('[approveAdRequest] Durations updated to approved status');

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
