import jwt from 'jsonwebtoken';
import authenticate from '../../middlewares/auth.js';

export const Query = {
    // ==========================================
    // ADMIN REPORTING QUERIES
    // ==========================================

    /**
     * Get revenue report for a specific period (monthly/quarterly/annual)
     */
    getAdminRevenueReport: async (_, { period, year, month, quarter }, { models }) => {
        try {
            // Build date filter based on period
            let startDate, endDate;

            if (period === 'monthly') {
                if (!month) throw new Error('Month is required for monthly reports');
                startDate = new Date(year, month - 1, 1);
                endDate = new Date(year, month, 0, 23, 59, 59);
            } else if (period === 'quarterly') {
                if (!quarter) throw new Error('Quarter is required for quarterly reports');
                const startMonth = (quarter - 1) * 3;
                startDate = new Date(year, startMonth, 1);
                endDate = new Date(year, startMonth + 3, 0, 23, 59, 59);
            } else if (period === 'annual') {
                startDate = new Date(year, 0, 1);
                endDate = new Date(year, 11, 31, 23, 59, 59);
            } else {
                throw new Error('Invalid period. Use: monthly, quarterly, or annual');
            }

            // Find all approved/running category requests in the date range
            const categoryRequests = await models.CategoryRequest.find({
                status: { $in: ['approved', 'running'] },
                createdAt: { $gte: startDate, $lte: endDate }
            })
                .populate('tier_id', 'name')
                .lean();

            // Get all tier IDs
            const tierIds = [...new Set(categoryRequests.map(cr => cr.tier_id?._id?.toString()).filter(Boolean))];

            // Calculate revenue per tier
            const breakdown = [];
            let totalRevenue = 0;

            for (const tierId of tierIds) {
                const tierRequests = categoryRequests.filter(
                    cr => cr.tier_id?._id?.toString() === tierId
                );

                const tierName = tierRequests[0]?.tier_id?.name || 'Unknown';

                // Get request IDs for this tier
                const requestIds = tierRequests.map(req => req._id);

                // Get all media slots for these requests
                const mediaSlots = await models.CategoryRequestMedia.find({
                    category_request_id: { $in: requestIds }
                }).lean();

                // Count banner and stamp slots
                let bannerCount = 0;
                let stampCount = 0;

                for (const media of mediaSlots) {
                    if (media.slot.startsWith('banner')) {
                        bannerCount++;
                    } else if (media.slot.startsWith('stamp')) {
                        stampCount++;
                    }
                }

                // Get pricing for this tier (separate prices for banner and stamp)
                const bannerPrice = await models.AdCategory.findOne({
                    categoryMasterId: tierId,
                    ad_type: 'banner',
                    is_active: true
                }).lean();

                const stampPrice = await models.AdCategory.findOne({
                    categoryMasterId: tierId,
                    ad_type: 'stamp',
                    is_active: true
                }).lean();

                // Calculate revenue based on actual slots purchased
                const tierRevenue =
                    (bannerCount * (bannerPrice?.price || 0)) +
                    (stampCount * (stampPrice?.price || 0));

                totalRevenue += tierRevenue;

                breakdown.push({
                    tierId,
                    tierName,
                    revenue: tierRevenue,
                    adCount: bannerCount + stampCount,
                    bannerCount,
                    stampCount
                });
            }

            return {
                totalRevenue,
                period,
                year,
                month: month || null,
                quarter: quarter || null,
                breakdown
            };
        } catch (err) {
            console.error('[getAdminRevenueReport] error:', err);
            throw new Error('Failed to generate revenue report: ' + err.message);
        }
    },

    /**
     * Get ads sold by tier with optional date filtering
     */
    getAdminTierSalesReport: async (_, { startDate, endDate }, { models }) => {
        try {
            // Build date filter
            const dateFilter = {};
            if (startDate || endDate) {
                dateFilter.createdAt = {};
                if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
                if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
            }

            // Get all approved/running requests
            const categoryRequests = await models.CategoryRequest.find({
                status: { $in: ['approved', 'running'] },
                ...dateFilter
            })
                .populate('tier_id', 'name')
                .lean();

            // Get all request IDs
            const requestIds = categoryRequests.map(cr => cr._id);

            // Get all media to count banner vs stamp
            const allMedia = await models.CategoryRequestMedia.find({
                category_request_id: { $in: requestIds }
            }).lean();

            // Group by tier
            const tierMap = {};

            for (const request of categoryRequests) {
                const tierId = request.tier_id?._id?.toString();
                if (!tierId) continue;

                if (!tierMap[tierId]) {
                    tierMap[tierId] = {
                        tierId,
                        tierName: request.tier_id?.name || 'Unknown',
                        totalAdsSold: 0,
                        bannerCount: 0,
                        stampCount: 0,
                        revenue: 0
                    };
                }

                // Count media types for this request
                const requestMedia = allMedia.filter(
                    m => m.category_request_id.toString() === request._id.toString()
                );

                requestMedia.forEach(media => {
                    if (media.slot.startsWith('banner')) {
                        tierMap[tierId].bannerCount++;
                    } else if (media.slot.startsWith('stamp')) {
                        tierMap[tierId].stampCount++;
                    }
                });

                tierMap[tierId].totalAdsSold += requestMedia.length;
            }

            // Calculate revenue for each tier using correct pricing
            for (const tierId in tierMap) {
                // Get pricing for this tier (separate prices for banner and stamp)
                const bannerPrice = await models.AdCategory.findOne({
                    categoryMasterId: tierId,
                    ad_type: 'banner',
                    is_active: true
                }).lean();

                const stampPrice = await models.AdCategory.findOne({
                    categoryMasterId: tierId,
                    ad_type: 'stamp',
                    is_active: true
                }).lean();

                // Calculate revenue based on actual slots purchased
                tierMap[tierId].revenue =
                    (tierMap[tierId].bannerCount * (bannerPrice?.price || 0)) +
                    (tierMap[tierId].stampCount * (stampPrice?.price || 0));
            }

            return Object.values(tierMap);
        } catch (err) {
            console.error('[getAdminTierSalesReport] error:', err);
            throw new Error('Failed to generate tier sales report: ' + err.message);
        }
    },

    /**
     * Get slot utilization across all tiers
     */
    getAdminSlotUtilization: async (_, __, { models }) => {
        try {
            // Get all active tiers
            const tiers = await models.AdTierMaster.find({ is_active: true }).lean();

            // Get all categories that have tiers assigned
            const categoriesWithTiers = await models.Category.countDocuments({
                adTierId: { $exists: true, $ne: null }
            });

            // Total slots per category = 8 (banner_1-4, stamp_1-4)
            const slotsPerCategory = 8;
            const totalSlots = categoriesWithTiers * slotsPerCategory;

            // Get all running slots
            const runningSlots = await models.CategoryRequestDuration.find({
                status: 'running'
            }).lean();

            const occupiedSlots = runningSlots.length;
            const availableSlots = totalSlots - occupiedSlots;
            const utilizationPercentage = totalSlots > 0 ? (occupiedSlots / totalSlots) * 100 : 0;

            // Calculate per-tier breakdown
            const tierBreakdown = [];

            for (const tier of tiers) {
                // Count categories for this tier
                const categoriesInTier = await models.Category.countDocuments({
                    adTierId: tier._id
                });

                const tierTotalSlots = categoriesInTier * slotsPerCategory;

                // Get category request IDs for this tier
                const tierCategoryRequestIds = await models.CategoryRequest.find({
                    tier_id: tier._id
                }).distinct('_id');

                // Count running slots for this tier
                const tierRunningSlots = await models.CategoryRequestDuration.countDocuments({
                    status: 'running',
                    category_request_id: { $in: tierCategoryRequestIds }
                });

                const tierOccupied = tierRunningSlots;
                const tierAvailable = tierTotalSlots - tierOccupied;
                const tierUtilization = tierTotalSlots > 0 ? (tierOccupied / tierTotalSlots) * 100 : 0;

                tierBreakdown.push({
                    tierId: tier._id.toString(),
                    tierName: tier.name,
                    totalSlots: tierTotalSlots,
                    occupiedSlots: tierOccupied,
                    availableSlots: tierAvailable,
                    utilizationPercentage: tierUtilization
                });
            }

            return {
                totalSlots,
                occupiedSlots,
                availableSlots,
                utilizationPercentage,
                tierBreakdown
            };
        } catch (err) {
            console.error('[getAdminSlotUtilization] error:', err);
            throw new Error('Failed to generate slot utilization report: ' + err.message);
        }
    },

    /**
     * Get pending approval requests
     */
    getAdminPendingApprovals: async (_, __, { models }) => {
        try {
            const pendingRequests = await models.CategoryRequest.find({
                status: 'pending'
            })
                .populate('seller_id', 'name email')
                .populate('category_id', 'name')
                .populate('tier_id', 'name')
                .sort({ createdAt: -1 })
                .lean();

            // Get slot counts for each request
            const requests = [];

            for (const req of pendingRequests) {
                const slotsCount = await models.CategoryRequestMedia.countDocuments({
                    category_request_id: req._id
                });

                requests.push({
                    id: req._id.toString(),
                    sellerId: req.seller_id?._id?.toString() || '',
                    sellerName: req.seller_id?.name || 'Unknown',
                    sellerEmail: req.seller_id?.email || null,
                    categoryId: req.category_id?._id?.toString() || '',
                    categoryName: req.category_id?.name || 'Unknown',
                    tierId: req.tier_id?._id?.toString() || '',
                    tierName: req.tier_id?.name || 'Unknown',
                    requestDate: req.createdAt ? new Date(req.createdAt).toISOString() : '',
                    slotsRequested: slotsCount
                });
            }

            return {
                count: requests.length,
                requests
            };
        } catch (err) {
            console.error('[getAdminPendingApprovals] error:', err);
            throw new Error('Failed to get pending approvals: ' + err.message);
        }
    },

    /**
     * Get ads expiring within specified days
     */
    getAdminExpiryUpcoming: async (_, { days }, { models }) => {
        try {
            const currentDate = new Date();
            const futureDate = new Date();
            futureDate.setDate(currentDate.getDate() + days);

            // Find durations expiring soon
            const expiringDurations = await models.CategoryRequestDuration.find({
                status: 'running',
                end_date: {
                    $gte: currentDate,
                    $lte: futureDate
                }
            })
                .sort({ end_date: 1 })
                .lean();

            const result = [];

            for (const duration of expiringDurations) {
                const categoryRequest = await models.CategoryRequest.findById(duration.category_request_id)
                    .populate('seller_id', 'name email')
                    .populate('category_id', 'name')
                    .populate('tier_id', 'name')
                    .lean();

                if (!categoryRequest) continue;

                const remainingDays = Math.ceil(
                    (new Date(duration.end_date) - currentDate) / (1000 * 60 * 60 * 24)
                );

                result.push({
                    id: duration._id.toString(),
                    categoryRequestId: categoryRequest._id.toString(),
                    sellerId: categoryRequest.seller_id?._id?.toString() || '',
                    sellerName: categoryRequest.seller_id?.name || 'Unknown',
                    sellerEmail: categoryRequest.seller_id?.email || null,
                    categoryId: categoryRequest.category_id?._id?.toString() || '',
                    categoryName: categoryRequest.category_id?.name || 'Unknown',
                    tierId: categoryRequest.tier_id?._id?.toString() || '',
                    tierName: categoryRequest.tier_id?.name || 'Unknown',
                    slot: duration.slot,
                    startDate: duration.start_date ? new Date(duration.start_date).toISOString() : '',
                    endDate: duration.end_date ? new Date(duration.end_date).toISOString() : '',
                    remainingDays
                });
            }

            return result;
        } catch (err) {
            console.error('[getAdminExpiryUpcoming] error:', err);
            throw new Error('Failed to get expiring ads: ' + err.message);
        }
    },

    /**
     * Get advertiser-wise spending report
     */
    getAdminAdvertiserSpending: async (_, { startDate, endDate }, { models }) => {
        try {
            // Build date filter
            const dateFilter = {};
            if (startDate || endDate) {
                dateFilter.createdAt = {};
                if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
                if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
            }

            // Get all requests
            const categoryRequests = await models.CategoryRequest.find({
                status: { $in: ['approved', 'running', 'completed'] },
                ...dateFilter
            })
                .populate('seller_id', 'name email')
                .populate('tier_id')
                .lean();

            // Group by seller
            const sellerMap = {};

            for (const request of categoryRequests) {
                const sellerId = request.seller_id?._id?.toString();
                if (!sellerId) continue;

                if (!sellerMap[sellerId]) {
                    sellerMap[sellerId] = {
                        sellerId,
                        sellerName: request.seller_id?.name || 'Unknown',
                        sellerEmail: request.seller_id?.email || null,
                        totalSpent: 0,
                        adCount: 0,
                        activeAdsCount: 0,
                        completedAdsCount: 0
                    };
                }

                // Count ads
                const mediaCount = await models.CategoryRequestMedia.countDocuments({
                    category_request_id: request._id
                });

                sellerMap[sellerId].adCount += mediaCount;

                if (request.status === 'running' || request.status === 'approved') {
                    sellerMap[sellerId].activeAdsCount += mediaCount;
                } else if (request.status === 'completed') {
                    sellerMap[sellerId].completedAdsCount += mediaCount;
                }

                // Calculate spending
                const tierId = request.tier_id?._id?.toString();
                if (tierId) {
                    const adCategories = await models.AdCategory.find({
                        categoryMasterId: tierId,
                        is_active: true
                    }).lean();

                    const avgPrice = adCategories.length > 0
                        ? adCategories.reduce((sum, ac) => sum + ac.price, 0) / adCategories.length
                        : 0;

                    sellerMap[sellerId].totalSpent += avgPrice * mediaCount;
                }
            }

            return Object.values(sellerMap).sort((a, b) => b.totalSpent - a.totalSpent);
        } catch (err) {
            console.error('[getAdminAdvertiserSpending] error:', err);
            throw new Error('Failed to generate advertiser spending report: ' + err.message);
        }
    },

    // ==========================================
    // ADVERTISER REPORTING QUERIES
    // ==========================================

    /**
     * Get seller's currently active ads
     */
    getMyActiveAds: authenticate(['seller'])(async (_, __, { models, req }) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) throw new Error('Authorization header missing');

            const token = authHeader.split(' ')[1];
            if (!token) throw new Error('Token missing');

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const sellerId = decoded._id;

            // Get active category requests
            const categoryRequests = await models.CategoryRequest.find({
                seller_id: sellerId,
                status: { $in: ['approved', 'running'] }
            })
                .populate('category_id', 'name')
                .populate('tier_id', 'name')
                .lean();

            const result = [];

            for (const request of categoryRequests) {
                // Get durations for this request (approved ads are automatically running)
                const durations = await models.CategoryRequestDuration.find({
                    category_request_id: request._id,
                    status: { $in: ['approved', 'running'] }
                }).lean();

                // Get media for this request
                const medias = await models.CategoryRequestMedia.find({
                    category_request_id: request._id
                }).lean();

                for (const duration of durations) {
                    const media = medias.find(m => m.slot === duration.slot);

                    const currentDate = new Date();
                    const endDate = new Date(duration.end_date);
                    const remainingDays = Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24));

                    result.push({
                        id: duration._id.toString(),
                        categoryRequestId: request._id.toString(),
                        categoryId: request.category_id?._id?.toString() || '',
                        categoryName: request.category_id?.name || 'Unknown',
                        tierId: request.tier_id?._id?.toString() || '',
                        tierName: request.tier_id?.name || 'Unknown',
                        slot: duration.slot,
                        status: duration.status,
                        startDate: duration.start_date ? new Date(duration.start_date).toISOString() : '',
                        endDate: duration.end_date ? new Date(duration.end_date).toISOString() : '',
                        remainingDays: remainingDays > 0 ? remainingDays : 0,
                        durationDays: duration.duration_days || 0,
                        media: media ? {
                            slot: media.slot,
                            mobileImageUrl: media.mobile_image_url,
                            desktopImageUrl: media.desktop_image_url,
                            mobileRedirectUrl: media.mobile_redirect_url,
                            desktopRedirectUrl: media.desktop_redirect_url
                        } : null
                    });
                }
            }

            return result.sort((a, b) => a.remainingDays - b.remainingDays);
        } catch (err) {
            console.error('[getMyActiveAds] error:', err);
            throw new Error('Failed to get active ads: ' + err.message);
        }
    }),

    /**
     * Get seller's past ads
     */
    getMyPastAds: authenticate(['seller'])(async (_, __, { models, req }) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) throw new Error('Authorization header missing');

            const token = authHeader.split(' ')[1];
            if (!token) throw new Error('Token missing');

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const sellerId = decoded._id;

            // Get all category requests for this seller (excluding only rejected ones)
            // Note: 'completed' status doesn't exist in CategoryRequest enum
            const categoryRequests = await models.CategoryRequest.find({
                seller_id: sellerId
            })
                .populate('category_id', 'name')
                .populate('tier_id', 'name')
                .sort({ updatedAt: -1 })
                .lean();

            const result = [];

            for (const request of categoryRequests) {
                // Get durations that are NOT currently active (exclude approved and running)
                // Since approved ads are automatically running, past ads should exclude both
                const durations = await models.CategoryRequestDuration.find({
                    category_request_id: request._id,
                    status: { $nin: ['approved', 'running'] }  // Exclude active ads
                }).lean();

                for (const duration of durations) {
                    result.push({
                        id: duration._id.toString(),
                        categoryRequestId: request._id.toString(),
                        categoryId: request.category_id?._id?.toString() || '',
                        categoryName: request.category_id?.name || 'Unknown',
                        tierId: request.tier_id?._id?.toString() || '',
                        tierName: request.tier_id?.name || 'Unknown',
                        slot: duration.slot,
                        status: duration.status,
                        startDate: duration.start_date ? new Date(duration.start_date).toISOString() : null,
                        endDate: duration.end_date ? new Date(duration.end_date).toISOString() : null,
                        durationDays: duration.duration_days || 0,
                        completedDate: duration.updatedAt ? new Date(duration.updatedAt).toISOString() : null
                    });
                }
            }

            return result;
        } catch (err) {
            console.error('[getMyPastAds] error:', err);
            throw new Error('Failed to get past ads: ' + err.message);
        }
    }),

    /**
     * Get validity info for seller's active ads
     */
    getMyAdValidity: authenticate(['seller'])(async (_, __, { models, req }) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) throw new Error('Authorization header missing');

            const token = authHeader.split(' ')[1];
            if (!token) throw new Error('Token missing');

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const sellerId = decoded._id;

            // Get active category requests
            const categoryRequests = await models.CategoryRequest.find({
                seller_id: sellerId,
                status: { $in: ['approved', 'running'] }
            })
                .populate('category_id', 'name')
                .lean();

            const result = [];

            for (const request of categoryRequests) {
                // Get running durations (approved ads are automatically running)
                const durations = await models.CategoryRequestDuration.find({
                    category_request_id: request._id,
                    status: { $in: ['approved', 'running'] }
                }).lean();

                for (const duration of durations) {
                    const currentDate = new Date();
                    const endDate = new Date(duration.end_date);
                    const remainingDays = Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24));
                    const isExpiringSoon = remainingDays <= 7 && remainingDays > 0;

                    result.push({
                        adId: duration._id.toString(),
                        categoryRequestId: request._id.toString(),
                        categoryName: request.category_id?.name || 'Unknown',
                        slot: duration.slot,
                        endDate: duration.end_date ? new Date(duration.end_date).toISOString() : '',
                        remainingDays: remainingDays > 0 ? remainingDays : 0,
                        status: duration.status,
                        isExpiringSoon
                    });
                }
            }

            return result.sort((a, b) => a.remainingDays - b.remainingDays);
        } catch (err) {
            console.error('[getMyAdValidity] error:', err);
            throw new Error('Failed to get ad validity info: ' + err.message);
        }
    })
};

export default { Query };
