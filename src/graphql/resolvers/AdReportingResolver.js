import jwt from 'jsonwebtoken';
import authenticate from '../../middlewares/auth.js';

// Helper: get actual revenue amount (final_price after coupon, or total_price for old records)
const getEffectivePrice = (dur) => {
    return (dur.final_price != null) ? dur.final_price : (dur.total_price || 0);
};

export const Query = {
    // ==========================================
    // ADMIN REPORTING QUERIES
    // ==========================================

    /**
     * Get revenue report for a specific period (monthly/quarterly/annual)
     */
    getAdminRevenueReport: async (_, { period, year, month, quarter, half }, { models }) => {
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
            } else if (period === 'half-yearly') {
                if (!half) throw new Error('Half (1 or 2) is required for half-yearly reports');
                const startMonth = half === 1 ? 0 : 6;
                startDate = new Date(year, startMonth, 1);
                endDate = new Date(year, startMonth + 6, 0, 23, 59, 59);
            } else {
                throw new Error('Invalid period. Use: quarterly, half-yearly, or annual');
            }

            // Find all approved/running/completed category requests in the date range
            const categoryRequests = await models.CategoryRequest.find({
                status: { $in: ['approved', 'running'] },
                createdAt: { $gte: startDate, $lte: endDate }
            })
                .populate('tier_id', 'name')
                .lean();

            // Get all tier IDs
            const tierIds = [...new Set(categoryRequests.map(cr => cr.tier_id?._id?.toString()).filter(Boolean))];

            // Calculate revenue per tier using actual prices paid
            const breakdown = [];
            let totalRevenue = 0;
            let totalCouponDiscount = 0;
            let totalNetRevenue = 0;

            for (const tierId of tierIds) {
                const tierRequests = categoryRequests.filter(
                    cr => cr.tier_id?._id?.toString() === tierId
                );

                const tierName = tierRequests[0]?.tier_id?.name || 'Unknown';

                // Get request IDs for this tier
                const requestIds = tierRequests.map(req => req._id);

                // Get all durations for these requests (contains actual pricing)
                const durations = await models.CategoryRequestDuration.find({
                    category_request_id: { $in: requestIds },
                    status: { $in: ['approved', 'running', 'completed'] }
                }).lean();

                // Count banner and stamp slots, sum revenue and coupon discounts
                let bannerCount = 0;
                let stampCount = 0;
                let tierRevenue = 0;
                let tierCouponDiscount = 0;

                for (const dur of durations) {
                    if (dur.slot.startsWith('banner')) {
                        bannerCount++;
                    } else if (dur.slot.startsWith('stamp')) {
                        stampCount++;
                    }
                    tierRevenue += dur.total_price || 0;
                    tierCouponDiscount += dur.coupon_discount_amount || 0;
                }

                const tierNetRevenue = tierRevenue - tierCouponDiscount;
                totalRevenue += tierRevenue;
                totalCouponDiscount += tierCouponDiscount;
                totalNetRevenue += tierNetRevenue;

                breakdown.push({
                    tierId,
                    tierName,
                    revenue: tierRevenue,
                    adCount: bannerCount + stampCount,
                    bannerCount,
                    stampCount,
                    couponDiscount: tierCouponDiscount,
                    netRevenue: tierNetRevenue
                });
            }

            return {
                totalRevenue,
                totalCouponDiscount,
                totalNetRevenue,
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

            // Get all durations (contains actual pricing via total_price)
            const allDurations = await models.CategoryRequestDuration.find({
                category_request_id: { $in: requestIds },
                status: { $in: ['approved', 'running', 'completed'] }
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
                        revenue: 0,
                        couponDiscount: 0,
                        netRevenue: 0
                    };
                }

                // Get durations for this request
                const requestDurations = allDurations.filter(
                    d => d.category_request_id.toString() === request._id.toString()
                );

                requestDurations.forEach(dur => {
                    if (dur.slot.startsWith('banner')) {
                        tierMap[tierId].bannerCount++;
                    } else if (dur.slot.startsWith('stamp')) {
                        tierMap[tierId].stampCount++;
                    }
                    tierMap[tierId].revenue += dur.total_price || 0;
                    tierMap[tierId].couponDiscount += dur.coupon_discount_amount || 0;
                });

                tierMap[tierId].totalAdsSold += requestDurations.length;
            }

            // Calculate netRevenue for each tier
            const result = Object.values(tierMap).map(t => ({
                ...t,
                netRevenue: t.revenue - t.couponDiscount
            }));

            return result;
        } catch (err) {
            console.error('[getAdminTierSalesReport] error:', err);
            throw new Error('Failed to generate tier sales report: ' + err.message);
        }
    },

    /**
     * Get slot utilization across all tiers - quarter-aware
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

            // Get all occupied durations (approved = active, running = legacy active)
            const occupiedDurations = await models.CategoryRequestDuration.find({
                status: { $in: ['approved', 'running'] }
            }).lean();

            const occupiedSlots = occupiedDurations.length;
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

                // Count occupied slots for this tier (approved + running)
                const tierRunningSlots = await models.CategoryRequestDuration.countDocuments({
                    status: { $in: ['approved', 'running'] },
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

            // Build quarter-slot detail list showing exactly who booked what in which quarter
            const quarterSlotDetails = [];
            if (occupiedDurations.length > 0) {
                // Get all category requests for these durations
                const crIds = [...new Set(occupiedDurations.map(d => d.category_request_id.toString()))];
                const categoryRequests = await models.CategoryRequest.find({
                    _id: { $in: crIds }
                })
                    .populate('seller_id', 'firstName lastName')
                    .populate('category_id', 'name')
                    .populate('tier_id', 'name')
                    .lean();

                const crMap = {};
                for (const cr of categoryRequests) {
                    crMap[cr._id.toString()] = cr;
                }

                for (const dur of occupiedDurations) {
                    const cr = crMap[dur.category_request_id.toString()];
                    const sellerObj = cr?.seller_id;
                    const sellerName = sellerObj ? `${sellerObj.firstName || ''} ${sellerObj.lastName || ''}`.trim() || 'Unknown' : 'Unknown';
                    const categoryName = cr?.category_id?.name || 'Unknown';
                    const tierName = cr?.tier_id?.name || 'Unknown';

                    // Create one entry per quarter covered
                    const quarters = dur.quarters_covered && dur.quarters_covered.length > 0
                        ? dur.quarters_covered
                        : ['N/A'];

                    for (const q of quarters) {
                        quarterSlotDetails.push({
                            quarter: q,
                            slot: dur.slot,
                            sellerName,
                            categoryName,
                            tierName,
                            status: dur.status,
                            startDate: dur.start_date ? new Date(dur.start_date).toISOString() : '',
                            endDate: dur.end_date ? new Date(dur.end_date).toISOString() : ''
                        });
                    }
                }

                // Sort by quarter then slot
                quarterSlotDetails.sort((a, b) => {
                    if (a.quarter < b.quarter) return -1;
                    if (a.quarter > b.quarter) return 1;
                    return a.slot.localeCompare(b.slot);
                });
            }

            return {
                totalSlots,
                occupiedSlots,
                availableSlots,
                utilizationPercentage,
                tierBreakdown,
                quarterSlotDetails
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
                .populate('seller_id', 'firstName lastName email')
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
                    sellerName: req.seller_id ? `${req.seller_id.firstName || ''} ${req.seller_id.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
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

            // Find durations expiring soon (approved = active, running = legacy active)
            const expiringDurations = await models.CategoryRequestDuration.find({
                status: { $in: ['approved', 'running'] },
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
                    .populate('seller_id', 'firstName lastName email')
                    .populate('category_id', 'name')
                    .populate('tier_id', 'name')
                    .lean();

                if (!categoryRequest) continue;

                const remainingDays = Math.ceil(
                    (new Date(duration.end_date) - currentDate) / (1000 * 60 * 60 * 24)
                );

                const sellerObj = categoryRequest.seller_id;
                const sellerFullName = sellerObj ? `${sellerObj.firstName || ''} ${sellerObj.lastName || ''}`.trim() || 'Unknown' : 'Unknown';

                result.push({
                    id: duration._id.toString(),
                    categoryRequestId: categoryRequest._id.toString(),
                    sellerId: sellerObj?._id?.toString() || '',
                    sellerName: sellerFullName,
                    sellerEmail: sellerObj?.email || null,
                    categoryId: categoryRequest.category_id?._id?.toString() || '',
                    categoryName: categoryRequest.category_id?.name || 'Unknown',
                    tierId: categoryRequest.tier_id?._id?.toString() || '',
                    tierName: categoryRequest.tier_id?.name || 'Unknown',
                    slot: duration.slot,
                    startDate: duration.start_date ? new Date(duration.start_date).toISOString() : '',
                    endDate: duration.end_date ? new Date(duration.end_date).toISOString() : '',
                    remainingDays,
                    quartersCovered: duration.quarters_covered || [],
                    totalPrice: duration.total_price || 0,
                    couponCode: duration.coupon_code || null,
                    couponDiscountAmount: duration.coupon_discount_amount || 0,
                    finalPrice: getEffectivePrice(duration)
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

            // Get all approved/running requests (CategoryRequest enum has no 'completed')
            const categoryRequests = await models.CategoryRequest.find({
                status: { $in: ['approved', 'running'] },
                ...dateFilter
            })
                .populate('seller_id', 'firstName lastName email')
                .lean();

            // Get all durations for these requests (to get actual spending and completed counts)
            const allRequestIds = categoryRequests.map(cr => cr._id);
            const allDurations = await models.CategoryRequestDuration.find({
                category_request_id: { $in: allRequestIds },
                status: { $in: ['approved', 'running', 'completed'] }
            }).lean();

            // Group by seller
            const sellerMap = {};

            for (const request of categoryRequests) {
                const sellerId = request.seller_id?._id?.toString();
                if (!sellerId) continue;

                if (!sellerMap[sellerId]) {
                    const sellerObj = request.seller_id;
                    sellerMap[sellerId] = {
                        sellerId,
                        sellerName: sellerObj ? `${sellerObj.firstName || ''} ${sellerObj.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
                        sellerEmail: sellerObj?.email || null,
                        totalSpent: 0,
                        adCount: 0,
                        activeAdsCount: 0,
                        completedAdsCount: 0,
                        totalCouponDiscount: 0
                    };
                }

                // Get durations for this request
                const requestDurations = allDurations.filter(
                    d => d.category_request_id.toString() === request._id.toString()
                );

                for (const dur of requestDurations) {
                    sellerMap[sellerId].adCount++;
                    sellerMap[sellerId].totalSpent += getEffectivePrice(dur);
                    sellerMap[sellerId].totalCouponDiscount += dur.coupon_discount_amount || 0;

                    if (dur.status === 'approved' || dur.status === 'running') {
                        sellerMap[sellerId].activeAdsCount++;
                    } else if (dur.status === 'completed') {
                        sellerMap[sellerId].completedAdsCount++;
                    }
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
    getMyActiveAds: authenticate(['seller', 'adManager', 'adsAssociate'])(async (_, __, { models, req }) => {
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
                        quartersCovered: duration.quarters_covered || [],
                        totalPrice: duration.total_price || 0,
                        couponCode: duration.coupon_code || null,
                        couponDiscountAmount: duration.coupon_discount_amount || 0,
                        finalPrice: getEffectivePrice(duration),
                        media: media ? {
                            slot: media.slot,
                            mobileImageUrl: media.mobile_image_url,
                            desktopImageUrl: media.desktop_image_url,
                            redirectUrl: media.redirect_url
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
    getMyPastAds: authenticate(['seller', 'adManager', 'adsAssociate'])(async (_, __, { models, req }) => {
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
                        completedDate: duration.updatedAt ? new Date(duration.updatedAt).toISOString() : null,
                        quartersCovered: duration.quarters_covered || [],
                        totalPrice: duration.total_price || 0,
                        couponCode: duration.coupon_code || null,
                        couponDiscountAmount: duration.coupon_discount_amount || 0,
                        finalPrice: getEffectivePrice(duration)
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
    getMyAdValidity: authenticate(['seller', 'adManager', 'adsAssociate'])(async (_, __, { models, req }) => {
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
                        isExpiringSoon,
                        quartersCovered: duration.quarters_covered || []
                    });
                }
            }

            return result.sort((a, b) => a.remainingDays - b.remainingDays);
        } catch (err) {
            console.error('[getMyAdValidity] error:', err);
            throw new Error('Failed to get ad validity info: ' + err.message);
        }
    }),

    // ==========================================
    // ADMIN PRODUCT AD REPORTING QUERIES
    // ==========================================

    /**
     * Get product ad revenue report for a specific period (monthly/quarterly/annual)
     */
    getAdminProductAdRevenueReport: async (_, { period, year, month, quarter, half }, { models }) => {
        try {
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
            } else if (period === 'half-yearly') {
                if (!half) throw new Error('Half (1 or 2) is required for half-yearly reports');
                const startMonth = half === 1 ? 0 : 6;
                startDate = new Date(year, startMonth, 1);
                endDate = new Date(year, startMonth + 6, 0, 23, 59, 59);
            } else {
                throw new Error('Invalid period. Use: quarterly, half-yearly, or annual');
            }

            const productAdRequests = await models.ProductAdRequest.find({
                status: { $in: ['approved', 'running'] },
                createdAt: { $gte: startDate, $lte: endDate }
            })
                .populate('tier_id', 'name')
                .lean();

            const tierIds = [...new Set(productAdRequests.map(r => r.tier_id?._id?.toString()).filter(Boolean))];

            const breakdown = [];
            let totalRevenue = 0;
            let totalCouponDiscount = 0;
            let totalNetRevenue = 0;

            for (const tierId of tierIds) {
                const tierRequests = productAdRequests.filter(r => r.tier_id?._id?.toString() === tierId);
                const tierName = tierRequests[0]?.tier_id?.name || 'Unknown';
                const requestIds = tierRequests.map(r => r._id);

                const durations = await models.ProductAdRequestDuration.find({
                    product_ad_request_id: { $in: requestIds },
                    status: { $in: ['approved', 'running', 'completed'] }
                }).lean();

                let bannerCount = 0;
                let stampCount = 0;
                let tierRevenue = 0;
                let tierCouponDiscount = 0;

                for (const dur of durations) {
                    if (dur.slot.startsWith('banner')) bannerCount++;
                    else if (dur.slot.startsWith('stamp')) stampCount++;
                    tierRevenue += dur.total_price || 0;
                    tierCouponDiscount += dur.coupon_discount_amount || 0;
                }

                const tierNetRevenue = tierRevenue - tierCouponDiscount;
                totalRevenue += tierRevenue;
                totalCouponDiscount += tierCouponDiscount;
                totalNetRevenue += tierNetRevenue;

                breakdown.push({
                    tierId,
                    tierName,
                    revenue: tierRevenue,
                    adCount: bannerCount + stampCount,
                    bannerCount,
                    stampCount,
                    couponDiscount: tierCouponDiscount,
                    netRevenue: tierNetRevenue
                });
            }

            return {
                totalRevenue,
                totalCouponDiscount,
                totalNetRevenue,
                period,
                year,
                month: month || null,
                quarter: quarter || null,
                breakdown
            };
        } catch (err) {
            console.error('[getAdminProductAdRevenueReport] error:', err);
            throw new Error('Failed to generate product ad revenue report: ' + err.message);
        }
    },

    /**
     * Get product ads sold by tier with optional date filtering
     */
    getAdminProductAdTierSalesReport: async (_, { startDate, endDate }, { models }) => {
        try {
            const dateFilter = {};
            if (startDate || endDate) {
                dateFilter.createdAt = {};
                if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
                if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
            }

            const productAdRequests = await models.ProductAdRequest.find({
                status: { $in: ['approved', 'running'] },
                ...dateFilter
            })
                .populate('tier_id', 'name')
                .lean();

            const requestIds = productAdRequests.map(r => r._id);
            const allDurations = await models.ProductAdRequestDuration.find({
                product_ad_request_id: { $in: requestIds },
                status: { $in: ['approved', 'running', 'completed'] }
            }).lean();

            const tierMap = {};

            for (const request of productAdRequests) {
                const tierId = request.tier_id?._id?.toString();
                if (!tierId) continue;

                if (!tierMap[tierId]) {
                    tierMap[tierId] = {
                        tierId,
                        tierName: request.tier_id?.name || 'Unknown',
                        totalAdsSold: 0,
                        bannerCount: 0,
                        stampCount: 0,
                        revenue: 0,
                        couponDiscount: 0,
                        netRevenue: 0
                    };
                }

                const requestDurations = allDurations.filter(
                    d => d.product_ad_request_id.toString() === request._id.toString()
                );

                requestDurations.forEach(dur => {
                    if (dur.slot.startsWith('banner')) tierMap[tierId].bannerCount++;
                    else if (dur.slot.startsWith('stamp')) tierMap[tierId].stampCount++;
                    tierMap[tierId].revenue += dur.total_price || 0;
                    tierMap[tierId].couponDiscount += dur.coupon_discount_amount || 0;
                });

                tierMap[tierId].totalAdsSold += requestDurations.length;
            }

            return Object.values(tierMap).map(t => ({
                ...t,
                netRevenue: t.revenue - t.couponDiscount
            }));
        } catch (err) {
            console.error('[getAdminProductAdTierSalesReport] error:', err);
            throw new Error('Failed to generate product ad tier sales report: ' + err.message);
        }
    },

    /**
     * Get pending product ad approval requests
     */
    getAdminProductAdPendingApprovals: async (_, __, { models }) => {
        try {
            const pendingRequests = await models.ProductAdRequest.find({ status: 'pending' })
                .populate('seller_id', 'firstName lastName email')
                .populate('product_id', 'fullName previewName')
                .populate('tier_id', 'name')
                .sort({ createdAt: -1 })
                .lean();

            const requests = pendingRequests.map(req => {
                const sellerObj = req.seller_id;
                const productObj = req.product_id;
                return {
                    id: req._id.toString(),
                    sellerId: sellerObj?._id?.toString() || '',
                    sellerName: sellerObj ? `${sellerObj.firstName || ''} ${sellerObj.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
                    sellerEmail: sellerObj?.email || null,
                    productId: productObj?._id?.toString() || '',
                    productName: productObj?.fullName || productObj?.previewName || 'Unknown',
                    tierId: req.tier_id?._id?.toString() || '',
                    tierName: req.tier_id?.name || 'Unknown',
                    requestDate: req.createdAt ? new Date(req.createdAt).toISOString() : ''
                };
            });

            return { count: requests.length, requests };
        } catch (err) {
            console.error('[getAdminProductAdPendingApprovals] error:', err);
            throw new Error('Failed to get pending product ad approvals: ' + err.message);
        }
    },

    /**
     * Get product ads expiring within specified days
     */
    getAdminProductAdExpiryUpcoming: async (_, { days }, { models }) => {
        try {
            const currentDate = new Date();
            const futureDate = new Date();
            futureDate.setDate(currentDate.getDate() + days);

            const expiringDurations = await models.ProductAdRequestDuration.find({
                status: { $in: ['approved', 'running'] },
                end_date: { $gte: currentDate, $lte: futureDate }
            })
                .sort({ end_date: 1 })
                .lean();

            const result = [];

            for (const duration of expiringDurations) {
                const productAdRequest = await models.ProductAdRequest.findById(duration.product_ad_request_id)
                    .populate('seller_id', 'firstName lastName email')
                    .populate('product_id', 'fullName previewName')
                    .populate('tier_id', 'name')
                    .lean();

                if (!productAdRequest) continue;

                const remainingDays = Math.ceil((new Date(duration.end_date) - currentDate) / (1000 * 60 * 60 * 24));
                const sellerObj = productAdRequest.seller_id;
                const productObj = productAdRequest.product_id;

                result.push({
                    id: duration._id.toString(),
                    productAdRequestId: productAdRequest._id.toString(),
                    sellerId: sellerObj?._id?.toString() || '',
                    sellerName: sellerObj ? `${sellerObj.firstName || ''} ${sellerObj.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
                    sellerEmail: sellerObj?.email || null,
                    productId: productObj?._id?.toString() || '',
                    productName: productObj?.fullName || productObj?.previewName || 'Unknown',
                    tierId: productAdRequest.tier_id?._id?.toString() || '',
                    tierName: productAdRequest.tier_id?.name || 'Unknown',
                    slot: duration.slot,
                    startDate: duration.start_date ? new Date(duration.start_date).toISOString() : '',
                    endDate: duration.end_date ? new Date(duration.end_date).toISOString() : '',
                    remainingDays,
                    totalPrice: duration.total_price || 0,
                    couponCode: duration.coupon_code || null,
                    couponDiscountAmount: duration.coupon_discount_amount || 0,
                    finalPrice: getEffectivePrice(duration)
                });
            }

            return result;
        } catch (err) {
            console.error('[getAdminProductAdExpiryUpcoming] error:', err);
            throw new Error('Failed to get expiring product ads: ' + err.message);
        }
    },

    /**
     * Get seller-wise product ad spending report
     */
    getAdminProductAdAdvertiserSpending: async (_, { startDate, endDate }, { models }) => {
        try {
            const dateFilter = {};
            if (startDate || endDate) {
                dateFilter.createdAt = {};
                if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
                if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
            }

            const productAdRequests = await models.ProductAdRequest.find({
                status: { $in: ['approved', 'running'] },
                ...dateFilter
            })
                .populate('seller_id', 'firstName lastName email')
                .lean();

            const allRequestIds = productAdRequests.map(r => r._id);
            const allDurations = await models.ProductAdRequestDuration.find({
                product_ad_request_id: { $in: allRequestIds },
                status: { $in: ['approved', 'running', 'completed'] }
            }).lean();

            const sellerMap = {};

            for (const request of productAdRequests) {
                const sellerId = request.seller_id?._id?.toString();
                if (!sellerId) continue;

                if (!sellerMap[sellerId]) {
                    const sellerObj = request.seller_id;
                    sellerMap[sellerId] = {
                        sellerId,
                        sellerName: sellerObj ? `${sellerObj.firstName || ''} ${sellerObj.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
                        sellerEmail: sellerObj?.email || null,
                        totalSpent: 0,
                        adCount: 0,
                        activeAdsCount: 0,
                        completedAdsCount: 0,
                        totalCouponDiscount: 0
                    };
                }

                const requestDurations = allDurations.filter(
                    d => d.product_ad_request_id.toString() === request._id.toString()
                );

                for (const dur of requestDurations) {
                    sellerMap[sellerId].adCount++;
                    sellerMap[sellerId].totalSpent += getEffectivePrice(dur);
                    sellerMap[sellerId].totalCouponDiscount += dur.coupon_discount_amount || 0;
                    if (dur.status === 'approved' || dur.status === 'running') {
                        sellerMap[sellerId].activeAdsCount++;
                    } else if (dur.status === 'completed') {
                        sellerMap[sellerId].completedAdsCount++;
                    }
                }
            }

            return Object.values(sellerMap).sort((a, b) => b.totalSpent - a.totalSpent);
        } catch (err) {
            console.error('[getAdminProductAdAdvertiserSpending] error:', err);
            throw new Error('Failed to generate product ad advertiser spending report: ' + err.message);
        }
    },

    // ==========================================
    // SELLER PRODUCT AD REPORTING QUERIES
    // ==========================================

    /**
     * Get seller's currently active product ads
     */
    getMyActiveProductAds: authenticate(['seller', 'adManager', 'adsAssociate'])(async (_, __, { models, req }) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) throw new Error('Authorization header missing');
            const token = authHeader.split(' ')[1];
            if (!token) throw new Error('Token missing');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const sellerId = decoded._id;

            const productAdRequests = await models.ProductAdRequest.find({
                seller_id: sellerId,
                status: { $in: ['approved', 'running'] }
            })
                .populate('product_id', 'fullName previewName')
                .populate('tier_id', 'name')
                .lean();

            const result = [];

            for (const request of productAdRequests) {
                const durations = await models.ProductAdRequestDuration.find({
                    product_ad_request_id: request._id,
                    status: { $in: ['approved', 'running'] }
                }).lean();

                const medias = await models.ProductAdRequestMedia.find({
                    product_ad_request_id: request._id
                }).lean();

                for (const duration of durations) {
                    const media = medias.find(m => m.slot === duration.slot);
                    const currentDate = new Date();
                    const endDate = new Date(duration.end_date);
                    const remainingDays = Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24));

                    result.push({
                        id: duration._id.toString(),
                        productAdRequestId: request._id.toString(),
                        productId: request.product_id?._id?.toString() || '',
                        productName: request.product_id?.fullName || request.product_id?.previewName || 'Unknown',
                        tierId: request.tier_id?._id?.toString() || '',
                        tierName: request.tier_id?.name || 'Unknown',
                        slot: duration.slot,
                        status: duration.status,
                        startDate: duration.start_date ? new Date(duration.start_date).toISOString() : '',
                        endDate: duration.end_date ? new Date(duration.end_date).toISOString() : '',
                        remainingDays: remainingDays > 0 ? remainingDays : 0,
                        durationDays: duration.duration_days || 0,
                        totalPrice: duration.total_price || 0,
                        couponCode: duration.coupon_code || null,
                        couponDiscountAmount: duration.coupon_discount_amount || 0,
                        finalPrice: getEffectivePrice(duration),
                        media: media ? {
                            slot: media.slot,
                            mobileImageUrl: media.mobile_image_url || null,
                            desktopImageUrl: media.desktop_image_url || null,
                            redirectUrl: media.mobile_redirect_url || media.desktop_redirect_url || null
                        } : null
                    });
                }
            }

            return result.sort((a, b) => a.remainingDays - b.remainingDays);
        } catch (err) {
            console.error('[getMyActiveProductAds] error:', err);
            throw new Error('Failed to get active product ads: ' + err.message);
        }
    }),

    /**
     * Get seller's past product ads
     */
    getMyPastProductAds: authenticate(['seller', 'adManager', 'adsAssociate'])(async (_, __, { models, req }) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) throw new Error('Authorization header missing');
            const token = authHeader.split(' ')[1];
            if (!token) throw new Error('Token missing');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const sellerId = decoded._id;

            const productAdRequests = await models.ProductAdRequest.find({ seller_id: sellerId })
                .populate('product_id', 'fullName previewName')
                .populate('tier_id', 'name')
                .sort({ updatedAt: -1 })
                .lean();

            const result = [];

            for (const request of productAdRequests) {
                const durations = await models.ProductAdRequestDuration.find({
                    product_ad_request_id: request._id,
                    status: { $nin: ['approved', 'running'] }
                }).lean();

                for (const duration of durations) {
                    result.push({
                        id: duration._id.toString(),
                        productAdRequestId: request._id.toString(),
                        productId: request.product_id?._id?.toString() || '',
                        productName: request.product_id?.fullName || request.product_id?.previewName || 'Unknown',
                        tierId: request.tier_id?._id?.toString() || '',
                        tierName: request.tier_id?.name || 'Unknown',
                        slot: duration.slot,
                        status: duration.status,
                        startDate: duration.start_date ? new Date(duration.start_date).toISOString() : null,
                        endDate: duration.end_date ? new Date(duration.end_date).toISOString() : null,
                        durationDays: duration.duration_days || 0,
                        completedDate: duration.updatedAt ? new Date(duration.updatedAt).toISOString() : null,
                        totalPrice: duration.total_price || 0,
                        couponCode: duration.coupon_code || null,
                        couponDiscountAmount: duration.coupon_discount_amount || 0,
                        finalPrice: getEffectivePrice(duration)
                    });
                }
            }

            return result;
        } catch (err) {
            console.error('[getMyPastProductAds] error:', err);
            throw new Error('Failed to get past product ads: ' + err.message);
        }
    }),

    /**
     * Get validity info for seller's active product ads
     */
    getMyProductAdValidity: authenticate(['seller', 'adManager', 'adsAssociate'])(async (_, __, { models, req }) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) throw new Error('Authorization header missing');
            const token = authHeader.split(' ')[1];
            if (!token) throw new Error('Token missing');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const sellerId = decoded._id;

            const productAdRequests = await models.ProductAdRequest.find({
                seller_id: sellerId,
                status: { $in: ['approved', 'running'] }
            })
                .populate('product_id', 'fullName previewName')
                .lean();

            const result = [];

            for (const request of productAdRequests) {
                const durations = await models.ProductAdRequestDuration.find({
                    product_ad_request_id: request._id,
                    status: { $in: ['approved', 'running'] }
                }).lean();

                for (const duration of durations) {
                    const currentDate = new Date();
                    const endDate = new Date(duration.end_date);
                    const remainingDays = Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24));
                    const isExpiringSoon = remainingDays <= 7 && remainingDays > 0;

                    result.push({
                        adId: duration._id.toString(),
                        productAdRequestId: request._id.toString(),
                        productName: request.product_id?.fullName || request.product_id?.previewName || 'Unknown',
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
            console.error('[getMyProductAdValidity] error:', err);
            throw new Error('Failed to get product ad validity info: ' + err.message);
        }
    })
};

export default { Query };
