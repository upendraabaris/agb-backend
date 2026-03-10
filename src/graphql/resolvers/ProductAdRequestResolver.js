import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import authenticate from '../../middlewares/auth.js';
import AdPricingConfig from '../../models/AdPricingConfig.js';
import SellerWallet from '../../models/SellerWallet.js';
import WalletTransaction from '../../models/WalletTransaction.js';

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

// ─── HELPER: Quarter computation utilities ───────────────────────────────────
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
    if (m >= 1 && m <= 3) return new Date(Date.UTC(year, 2, 31, 23, 59, 59, 999));
    if (m >= 4 && m <= 6) return new Date(Date.UTC(year, 5, 30, 23, 59, 59, 999));
    if (m >= 7 && m <= 9) return new Date(Date.UTC(year, 8, 30, 23, 59, 59, 999));
    return new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
};

const getNextQuarterStart = (date) => {
    const m = date.getUTCMonth();
    const year = date.getUTCFullYear();
    if (m <= 2) return new Date(Date.UTC(year, 3, 1));
    if (m <= 5) return new Date(Date.UTC(year, 6, 1));
    if (m <= 8) return new Date(Date.UTC(year, 9, 1));
    return new Date(Date.UTC(year + 1, 0, 1));
};

const addDays = (date, days) => {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
};

const splitIntervalByQuarter = (start, days) => {
    const segments = [];
    let current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    let remaining = days;
    const msPerDay = 24 * 60 * 60 * 1000;
    while (remaining > 0) {
        const quarterEnd = getQuarterEnd(current);
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

// Compute the candidate start date based on start_preference and optional selected_quarter
const resolveStartDate = (start_preference, selected_quarter, next4Quarters) => {
    if (start_preference === 'next_quarter') {
        return getNextQuarterStart(new Date());
    }
    if (start_preference === 'select_quarter' && selected_quarter) {
        const q = next4Quarters.find(q => q.quarter === selected_quarter);
        if (q) return new Date(q.startDate);
    }
    // default: today
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};


export const Query = {
    // ─── SELLER ────────────────────────────────────────────────────────────────
    // Get authenticated seller's own product ad requests
    getMyProductAds: authenticate(['seller'])(async (_, __, { models, req }) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) throw new Error('Token missing');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const sellerId = decoded._id;

            const requests = await models.ProductAdRequest.find({ seller_id: sellerId })
                .populate('product_id', 'fullName brand_name previewName thumbnail')
                .populate('tier_id', '_id')
                .lean()
                .sort({ createdAt: -1 });

            if (!requests || requests.length === 0) return [];

            const requestIds = requests.map(r => r._id);
            const [allMedias, allDurations] = await Promise.all([
                models.ProductAdRequestMedia.find({ product_ad_request_id: { $in: requestIds } }).lean(),
                models.ProductAdRequestDuration.find({ product_ad_request_id: { $in: requestIds } }).lean()
            ]);

            const mediasMap = {};
            const durationsMap = {};
            allMedias.forEach(m => {
                const key = m.product_ad_request_id.toString();
                if (!mediasMap[key]) mediasMap[key] = [];
                mediasMap[key].push(m);
            });
            allDurations.forEach(d => {
                const key = d.product_ad_request_id.toString();
                if (!durationsMap[key]) durationsMap[key] = [];
                durationsMap[key].push(d);
            });

            return requests
                .map(r => {
                    const reqId = r._id.toString();
                    let tierId = r.tier_id;
                    if (tierId && typeof tierId === 'object') tierId = tierId._id || tierId;
                    tierId = tierId ? tierId.toString() : null;
                    if (!tierId) return null;

                    const product = r.product_id;
                    return {
                        id: reqId,
                        product_id: product?._id?.toString(),
                        productName: product?.fullName || product?.previewName || 'Unknown',
                        brandName: product?.brand_name || null,
                        productThumbnail: product?.thumbnail || null,
                        tier_id: tierId,
                        status: r.status,
                        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
                        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
                        medias: (mediasMap[reqId] || []).map(m => ({
                            id: m._id?.toString(),
                            slot: m.slot,
                            media_type: m.media_type,
                            mobile_image_url: getFullImageUrl(m.mobile_image_url),
                            desktop_image_url: getFullImageUrl(m.desktop_image_url),
                            redirect_url: m.redirect_url || m.mobile_redirect_url || m.desktop_redirect_url,
                            mobile_redirect_url: m.mobile_redirect_url || '',
                            desktop_redirect_url: m.desktop_redirect_url || ''
                        })),
                        durations: (durationsMap[reqId] || []).map(d => ({
                            id: d._id?.toString(),
                            slot: d.slot,
                            duration_days: d.duration_days,
                            start_date: d.start_date ? new Date(d.start_date).toISOString() : null,
                            end_date: d.end_date ? new Date(d.end_date).toISOString() : null,
                            status: d.status,
                            start_preference: d.start_preference,
                            selected_quarter: d.selected_quarter,
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
                        }))
                    };
                })
                .filter(r => r !== null);
        } catch (err) {
            console.error('[getMyProductAds] error:', err);
            throw err;
        }
    }),

    // ─── ADMIN ─────────────────────────────────────────────────────────────────
    // Get all product ad requests (admin view), optionally filtered by status
    getProductAdRequestsForApproval: authenticate(['admin'])(async (_, { status }, { models, req }) => {
        try {
            const query = {};
            if (status && status !== 'all') query.status = status;

            const requests = await models.ProductAdRequest.find(query)
                .populate('seller_id', 'first_name last_name email')
                .populate('product_id', 'fullName brand_name previewName thumbnail')
                .populate('tier_id', '_id')
                .lean()
                .sort({ createdAt: -1 });

            if (!requests || requests.length === 0) return [];

            const requestIds = requests.map(r => r._id);
            const [allMedias, allDurations] = await Promise.all([
                models.ProductAdRequestMedia.find({ product_ad_request_id: { $in: requestIds } }).lean(),
                models.ProductAdRequestDuration.find({ product_ad_request_id: { $in: requestIds } }).lean()
            ]);

            const mediasMap = {};
            const durationsMap = {};
            allMedias.forEach(m => {
                const key = m.product_ad_request_id.toString();
                if (!mediasMap[key]) mediasMap[key] = [];
                mediasMap[key].push(m);
            });
            allDurations.forEach(d => {
                const key = d.product_ad_request_id.toString();
                if (!durationsMap[key]) durationsMap[key] = [];
                durationsMap[key].push(d);
            });

            return requests
                .map(r => {
                    const reqId = r._id.toString();
                    let tierId = r.tier_id;
                    if (tierId && typeof tierId === 'object') tierId = tierId._id || tierId;
                    tierId = tierId ? tierId.toString() : null;
                    if (!tierId) return null;

                    const product = r.product_id;
                    const sellerName = r.seller_id
                        ? `${r.seller_id.first_name || ''} ${r.seller_id.last_name || ''}`.trim()
                        : 'Unknown Seller';

                    return {
                        id: reqId,
                        seller_id: r.seller_id?._id?.toString(),
                        sellerName,
                        sellerEmail: r.seller_id?.email || 'N/A',
                        product_id: product?._id?.toString(),
                        productName: product?.fullName || product?.previewName || 'Unknown',
                        brandName: product?.brand_name || null,
                        productThumbnail: product?.thumbnail || null,
                        tier_id: tierId,
                        status: r.status,
                        medias: (mediasMap[reqId] || []).map(m => ({
                            id: m._id?.toString(),
                            slot: m.slot,
                            media_type: m.media_type,
                            mobile_image_url: getFullImageUrl(m.mobile_image_url),
                            desktop_image_url: getFullImageUrl(m.desktop_image_url),
                            redirect_url: m.redirect_url || m.mobile_redirect_url || m.desktop_redirect_url,
                            mobile_redirect_url: m.mobile_redirect_url || '',
                            desktop_redirect_url: m.desktop_redirect_url || ''
                        })),
                        durations: (durationsMap[reqId] || []).map(d => ({
                            id: d._id?.toString(),
                            slot: d.slot,
                            duration_days: d.duration_days,
                            start_date: d.start_date ? new Date(d.start_date).toISOString() : null,
                            end_date: d.end_date ? new Date(d.end_date).toISOString() : null,
                            status: d.status,
                            start_preference: d.start_preference,
                            selected_quarter: d.selected_quarter,
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
                        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
                        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null
                    };
                })
                .filter(r => r !== null);
        } catch (err) {
            console.error('[getProductAdRequestsForApproval] error:', err);
            throw err;
        }
    }),

    // ─── PRICING ───────────────────────────────────────────────────────────────
    // Get pricing for a product based on its own adTierId
    getProductAdPricing: async (_, { productId }, { models }) => {
        try {
            const product = await models.Product.findById(productId).populate('adTierId').lean();
            if (!product) throw new Error('Product not found');
            if (!product.adTierId) return null; // Admin hasn't assigned a tier yet

            const tierId = product.adTierId._id;
            const tierName = product.adTierId.name || 'Unknown Tier';

            const pricingConfig = await AdPricingConfig.findOne({ tier_id: tierId, is_active: true }).lean();
            if (!pricingConfig || !pricingConfig.generated_prices) {
                return { tierId: tierId.toString(), tierName, adCategories: [] };
            }

            const configId = pricingConfig._id?.toString();
            const adCategories = [];
            pricingConfig.generated_prices.forEach(gp => {
                const priority = gp.ad_type === 'banner' ? gp.slot_position : gp.slot_position + 4;
                adCategories.push(
                    { id: `${configId}_${gp.slot_name}_q`, ad_type: gp.ad_type, slot_name: gp.slot_name, slot_position: gp.slot_position, price: gp.quarterly, priority, duration_days: 90 },
                    { id: `${configId}_${gp.slot_name}_h`, ad_type: gp.ad_type, slot_name: gp.slot_name, slot_position: gp.slot_position, price: gp.half_yearly, priority, duration_days: 180 },
                    { id: `${configId}_${gp.slot_name}_y`, ad_type: gp.ad_type, slot_name: gp.slot_name, slot_position: gp.slot_position, price: gp.yearly, priority, duration_days: 365 }
                );
            });

            return { tierId: tierId.toString(), tierName, adCategories };
        } catch (err) {
            console.error('[getProductAdPricing] error:', err);
            throw new Error('Failed to fetch product ad pricing: ' + err.message);
        }
    },

    // ─── QUARTER AVAILABILITY ──────────────────────────────────────────────────
    // Returns the next 4 quarters with per-slot availability for a product
    getUpcomingQuartersForProduct: async (_, { productId }, { models }) => {
        try {
            const next4Quarters = getNext4Quarters();

            if (!productId) {
                // No product specified — return quarter list with all slots available
                const slotNames = ['banner_1', 'banner_2', 'banner_3', 'banner_4', 'stamp_1', 'stamp_2', 'stamp_3', 'stamp_4'];
                return next4Quarters.map(q => ({
                    quarter: q.quarter,
                    label: q.label,
                    startDate: q.startDate.toISOString(),
                    endDate: q.endDate.toISOString(),
                    slots: slotNames.map(slot => ({ slot, available: true }))
                }));
            }

            // Load booked durations for this product
            const allRequests = await models.ProductAdRequest.find({ product_id: productId })
                .select('_id')
                .lean();
            const requestIds = allRequests.map(r => r._id);

            const allDurations = requestIds.length > 0
                ? await models.ProductAdRequestDuration.find({
                    product_ad_request_id: { $in: requestIds },
                    status: { $in: ['pending', 'running', 'approved'] }
                }).select('slot start_date end_date').lean()
                : [];

            const slotNames = ['banner_1', 'banner_2', 'banner_3', 'banner_4', 'stamp_1', 'stamp_2', 'stamp_3', 'stamp_4'];

            return next4Quarters.map(q => {
                const slots = slotNames.map(slotName => {
                    const isBooked = allDurations.some(d =>
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
        } catch (err) {
            console.error('[getUpcomingQuartersForProduct] error:', err);
            return [];
        }
    },

    // ─── PUBLIC ────────────────────────────────────────────────────────────────
    // List all products with slot availability (for seller to pick a product to advertise)
    getProductsWithAvailableAdSlots: async (_, __, { models }) => {
        try {
            const products = await models.Product.find({ approve: true, active: true })
                .select('fullName previewName brand_name thumbnail adTierId')
                .populate('adTierId', 'name')
                .lean();

            if (!products || products.length === 0) return [];

            // Batch fetch all requests and durations (with end_date for freeDate)
            const allRequests = await models.ProductAdRequest.find()
                .select('_id product_id')
                .lean();

            const allDurations = await models.ProductAdRequestDuration.find({
                status: { $in: ['pending', 'running', 'approved'] }
            })
                .select('product_ad_request_id slot start_date end_date')
                .lean();


            // Map: requestId → productId
            const requestToProduct = {};
            allRequests.forEach(r => {
                requestToProduct[r._id.toString()] = r.product_id.toString();
            });

            // Map: productId → { slot → freeDate (end_date) }
            const slotInfoByProduct = {};
            allDurations.forEach(d => {
                const productId = requestToProduct[d.product_ad_request_id.toString()];
                if (!productId) return;
                if (!slotInfoByProduct[productId]) slotInfoByProduct[productId] = {};
                // Keep the latest end_date per slot (in case of multiple bookings)
                const existing = slotInfoByProduct[productId][d.slot];
                if (!existing || new Date(d.end_date) > new Date(existing)) {
                    slotInfoByProduct[productId][d.slot] = d.end_date ? new Date(d.end_date).toISOString() : null;
                }
            });

            const slotNames = ['banner_1', 'banner_2', 'banner_3', 'banner_4', 'stamp_1', 'stamp_2', 'stamp_3', 'stamp_4'];

            // Pre-compute next 4 quarters for quarter availability
            const next4Quarters = getNext4Quarters();

            return products.map(p => {
                const pid = p._id.toString();
                const slotInfo = slotInfoByProduct[pid] || {};
                const bookedSlots = Object.keys(slotInfo);
                const bookedBanner = bookedSlots.filter(s => s.startsWith('banner_')).length;
                const bookedStamp = bookedSlots.filter(s => s.startsWith('stamp_')).length;
                const bookedCount = bookedSlots.length;

                // Quarter availability per slot
                const productDurations = allDurations.filter(d => {
                    const productId = requestToProduct[d.product_ad_request_id.toString()];
                    return productId === pid;
                });

                const quarterAvailability = next4Quarters.map(q => {
                    const slots = slotNames.map(slotName => {
                        const isBooked = productDurations.some(d =>
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
                    id: pid,
                    productName: p.fullName || p.previewName || 'Unknown',
                    brandName: p.brand_name || null,
                    thumbnail: p.thumbnail || null,
                    tierName: p.adTierId?.name || null,
                    availableSlots: Math.max(0, 8 - bookedCount),
                    bookedSlots: bookedCount,
                    bookedBanner,
                    bookedStamp,
                    slotStatuses: slotNames.map(slot => ({
                        slot,
                        // CORRECT: Use key-existence, not truthy value — pending slots have null end_date but key IS set
                        available: !(slot in slotInfo),
                        freeDate: slotInfo[slot] || null,
                    })),
                    quarterAvailability
                };
            });
        } catch (err) {
            console.error('[getProductsWithAvailableAdSlots] error:', err);
            return [];
        }
    },

    // Get approved running ads for a specific product (by ID or name)
    getApprovedAdsByProduct: async (_, { productId, productName }, { models }) => {
        try {
            let finalProductId = productId;

            if (!productId && productName) {
                const nameTrim = productName.trim();
                const escaped = nameTrim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                let product = await models.Product.findOne({ fullName: { $regex: `^${escaped}$`, $options: 'i' } }).lean();
                if (!product) product = await models.Product.findOne({ fullName: { $regex: escaped, $options: 'i' } }).lean();
                if (!product) product = await models.Product.findOne({ previewName: { $regex: escaped, $options: 'i' } }).lean();
                if (product) finalProductId = product._id;
                else return [];
            }

            if (!finalProductId) {
                console.warn('[getApprovedAdsByProduct] missing productId and productName');
                return [];
            }

            const approvedRequests = await models.ProductAdRequest.find({
                product_id: finalProductId,
                status: { $in: ['approved', 'running'] }
            })
                .populate('seller_id', 'first_name last_name email')
                .populate('product_id', 'fullName previewName brand_name thumbnail')
                .lean()
                .sort({ createdAt: -1 });

            if (!approvedRequests || approvedRequests.length === 0) return [];

            const requestIds = approvedRequests.map(r => r._id);
            const [allMedias, allDurations] = await Promise.all([
                models.ProductAdRequestMedia.find({ product_ad_request_id: { $in: requestIds } }).lean(),
                models.ProductAdRequestDuration.find({ product_ad_request_id: { $in: requestIds } }).lean()
            ]);

            const mediasMap = {};
            const durationsMap = {};
            allMedias.forEach(m => {
                const key = m.product_ad_request_id.toString();
                if (!mediasMap[key]) mediasMap[key] = [];
                mediasMap[key].push(m);
            });
            allDurations.forEach(d => {
                const key = d.product_ad_request_id.toString();
                if (!durationsMap[key]) durationsMap[key] = [];
                durationsMap[key].push(d);
            });

            return approvedRequests
                .map(r => {
                    const reqId = r._id.toString();
                    const product = r.product_id;
                    const sellerName = r.seller_id
                        ? `${r.seller_id.first_name || ''} ${r.seller_id.last_name || ''}`.trim()
                        : 'Unknown Seller';

                    const medias = mediasMap[reqId] || [];
                    if (!medias.length) return null;

                    return {
                        id: reqId,
                        sellerName,
                        sellerEmail: r.seller_id?.email || 'N/A',
                        productId: product?._id?.toString(),
                        productName: product?.fullName || product?.previewName || 'Unknown',
                        brandName: product?.brand_name || null,
                        medias: medias.map(m => ({
                            id: m._id?.toString(),
                            slot: m.slot,
                            media_type: m.media_type,
                            mobile_image_url: getFullImageUrl(m.mobile_image_url),
                            desktop_image_url: getFullImageUrl(m.desktop_image_url),
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
                        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null
                    };
                })
                .filter(r => r !== null);
        } catch (err) {
            console.error('[getApprovedAdsByProduct] error:', err);
            throw err;
        }
    },

    // Get all globally running product banner ads
    getProductBannerAds: async (_, __, { models }) => {
        return _getRunningProductAds(models, '^banner_');
    },

    // Get all globally running product stamp ads
    getProductStampAds: async (_, __, { models }) => {
        return _getRunningProductAds(models, '^stamp_');
    }
};

// ─── Shared helper ─────────────────────────────────────────────────────────
async function _getRunningProductAds(models, slotRegex) {
    try {
        const approvedRequests = await models.ProductAdRequest.find({ status: { $in: ['approved', 'running'] } })
            .populate('seller_id', 'first_name last_name email')
            .populate('product_id', 'fullName previewName brand_name thumbnail')
            .lean()
            .sort({ createdAt: -1 });

        if (!approvedRequests || approvedRequests.length === 0) return [];

        const requestIds = approvedRequests.map(r => r._id);
        const [allMedias, allDurations] = await Promise.all([
            models.ProductAdRequestMedia.find({
                product_ad_request_id: { $in: requestIds },
                slot: { $regex: slotRegex }
            }).lean(),
            models.ProductAdRequestDuration.find({
                product_ad_request_id: { $in: requestIds },
                slot: { $regex: slotRegex }
            }).lean()
        ]);

        const mediasMap = {};
        const durationsMap = {};
        allMedias.forEach(m => {
            const key = m.product_ad_request_id.toString();
            if (!mediasMap[key]) mediasMap[key] = [];
            mediasMap[key].push(m);
        });
        allDurations.forEach(d => {
            const key = d.product_ad_request_id.toString();
            if (!durationsMap[key]) durationsMap[key] = [];
            durationsMap[key].push(d);
        });

        const now = new Date();
        return approvedRequests
            .map(r => {
                const reqId = r._id.toString();
                const medias = mediasMap[reqId] || [];
                if (!medias.length) return null;

                const durations = durationsMap[reqId] || [];
                const isRunning = durations.some(d => {
                    const start = d.start_date ? new Date(d.start_date) : null;
                    const end = d.end_date ? new Date(d.end_date) : null;
                    return start && end && now >= start && now <= end;
                });
                if (!isRunning) return null;

                const product = r.product_id;
                const sellerName = r.seller_id
                    ? `${r.seller_id.first_name || ''} ${r.seller_id.last_name || ''}`.trim()
                    : 'Unknown Seller';

                return {
                    id: reqId,
                    sellerName,
                    sellerEmail: r.seller_id?.email || 'N/A',
                    productId: product?._id?.toString(),
                    productName: product?.fullName || product?.previewName || 'Unknown',
                    brandName: product?.brand_name || null,
                    medias: medias.map(m => ({
                        id: m._id?.toString(),
                        slot: m.slot,
                        media_type: m.media_type,
                        mobile_image_url: getFullImageUrl(m.mobile_image_url),
                        desktop_image_url: getFullImageUrl(m.desktop_image_url),
                        mobile_redirect_url: m.mobile_redirect_url,
                        desktop_redirect_url: m.desktop_redirect_url
                    })),
                    durations: durations.map(d => ({
                        id: d._id?.toString(),
                        slot: d.slot,
                        duration_days: d.duration_days,
                        start_date: d.start_date ? new Date(d.start_date).toISOString() : null,
                        end_date: d.end_date ? new Date(d.end_date).toISOString() : null,
                        status: d.status
                    })),
                    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null
                };
            })
            .filter(r => r !== null);
    } catch (err) {
        console.error('[_getRunningProductAds] error:', err);
        return [];
    }
}

// ─── MUTATIONS ──────────────────────────────────────────────────────────────
export const Mutation = {
    // Seller creates a product ad request
    createProductAdRequest: authenticate(['seller'])(
        async (_, { input }, { models, req }) => {
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                const token = req.headers.authorization?.split(' ')[1];
                if (!token) throw new Error('Token missing');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const sellerId = decoded._id;

                console.log('[createProductAdRequest] Input:', JSON.stringify(input, null, 2));
                console.log('[createProductAdRequest] Seller ID:', sellerId);

                // Verify product exists and has an ad tier assigned directly
                const product = await models.Product.findById(input.product_id)
                    .populate('adTierId')
                    .lean();
                if (!product) throw new Error('Product not found');
                if (!product.adTierId) {
                    throw new Error('No ad tier assigned to this product. Admin must assign a tier first.');
                }

                const tierId = product.adTierId._id;

                // Load pricing config for this tier
                const pricingConfig = await AdPricingConfig.findOne({ tier_id: tierId, is_active: true }).lean();
                if (!pricingConfig || !pricingConfig.generated_prices) {
                    throw new Error('No pricing config found for this product tier. Please contact admin.');
                }

                console.log('[createProductAdRequest] Resolved tier:', tierId);

                // Resolve start date NOW (before conflict check) so we can do date-range overlap
                const next4Quarters = getNext4Quarters();
                const pref = input.start_preference || 'today';
                const startDate = resolveStartDate(pref, input.selected_quarter, next4Quarters);
                const candidateDays = input.duration_days || 90;
                // Compute intendedEndDate from actual quarter boundaries (not a fixed +90 days)
                // so conflict checks are accurate for Q2 (91 days), Q3/Q4 (92 days), etc.
                const NUM_Q_MAP = { 30: 1, 90: 1, 180: 2, 365: 4, 360: 4 };
                const numQConflict = NUM_Q_MAP[candidateDays] || 1;
                let intendedEndDate;
                if (pref !== 'today') {
                    // select_quarter / next_quarter: numQ full quarters from startDate
                    let cur = new Date(startDate);
                    for (let i = 0; i < numQConflict; i++) {
                        intendedEndDate = getQuarterEnd(cur);
                        cur = getNextQuarterStart(cur);
                    }
                } else {
                    // today: partial current Q + numQ full quarters starting from next Q
                    let cur = getNextQuarterStart(startDate);
                    for (let i = 0; i < numQConflict; i++) {
                        intendedEndDate = getQuarterEnd(cur);
                        cur = getNextQuarterStart(cur);
                    }
                }

                // Per-slot conflict check using DATE-RANGE OVERLAP:
                // A slot is only blocked if an existing booking overlaps the requested time window.
                // This means banner_3 booked for Q3 does NOT block Q4.
                // Pending bookings with no dates stored are treated as 'always conflicting' (legacy safety).
                const existingRequests = await models.ProductAdRequest.find({ product_id: input.product_id })
                    .select('_id').lean();
                const existingIds = existingRequests.map(r => r._id);
                const requestedSlots = input.medias.map(m => m.slot);
                if (existingIds.length > 0) {
                    const conflictingSlots = await models.ProductAdRequestDuration.find({
                        product_ad_request_id: { $in: existingIds },
                        slot: { $in: requestedSlots },
                        status: { $in: ['pending', 'running', 'approved'] },
                        // Only check records that have dates stored (new quarter-aware bookings)
                        start_date: { $ne: null, $lte: intendedEndDate },
                        end_date: { $ne: null, $gte: startDate },
                    }).select('slot').lean();

                    if (conflictingSlots.length > 0) {
                        const taken = [...new Set(conflictingSlots.map(d => d.slot))].join(', ');
                        throw new Error(`The following slot(s) are already booked for this period: ${taken}. Please choose a different slot or a different quarter.`);
                    }
                }

                // Guard the total 8-slot cap (count distinct slots booked in this time window)
                const bookedCount = existingIds.length > 0
                    ? await models.ProductAdRequestDuration.countDocuments({
                        product_ad_request_id: { $in: existingIds },
                        status: { $in: ['pending', 'running', 'approved'] },
                        start_date: { $ne: null, $lte: intendedEndDate },
                        end_date: { $ne: null, $gte: startDate },
                    })
                    : 0;

                if (bookedCount >= 8) throw new Error('All 8 ad slots for this product are taken for the selected period. Please choose a different product or quarter.');

                console.log('[createProductAdRequest] Booked slots for product:', bookedCount, '/ 8');

                // Create the request
                const requestDoc = await models.ProductAdRequest.create(
                    [{
                        seller_id: sellerId,
                        product_id: input.product_id,
                        tier_id: tierId,
                        status: 'pending',
                    }],
                    { session }
                );

                console.log('[createProductAdRequest] ProductAdRequest created:', requestDoc[0]._id);

                // Create media entries
                const medias = input.medias.map(m => ({
                    product_ad_request_id: requestDoc[0]._id,
                    slot: m.slot,
                    media_type: m.media_type || 'both',
                    mobile_image_url: m.mobile_image_url,
                    mobile_redirect_url: m.mobile_redirect_url,
                    desktop_image_url: m.desktop_image_url,
                    desktop_redirect_url: m.desktop_redirect_url
                }));
                await models.ProductAdRequestMedia.insertMany(medias, { session });

                // ─── Quarter / Duration + Pricing (mirrors category ad logic exactly) ─────
                const DURATION_MAP_PROD = {
                    30: { configKey: 'quarterly', numQuarters: 1 },
                    90: { configKey: 'quarterly', numQuarters: 1 },
                    180: { configKey: 'half_yearly', numQuarters: 2 },
                    365: { configKey: 'yearly', numQuarters: 4 },
                    360: { configKey: 'yearly', numQuarters: 4 },
                };
                const { configKey, numQuarters: numQ } = DURATION_MAP_PROD[candidateDays] || { configKey: 'quarterly', numQuarters: 1 };

                const durations = input.medias.map(m => {
                    const slotPriceEntry = pricingConfig.generated_prices.find(p => p.slot_name === m.slot);
                    const slotPrice = slotPriceEntry ? (slotPriceEntry[configKey] || 0) : 0;
                    const quarterlyPrice = slotPriceEntry ? (slotPriceEntry.quarterly || 0) : 0;

                    let durStart, durEnd;
                    const segments = [];
                    let proRataCharge = 0;

                    if (pref !== 'today') {
                        // ── "select_quarter" or "next_quarter": starts exactly at a quarter boundary ──
                        // Charge full price for numQ complete quarters.
                        let cursor = new Date(startDate);
                        for (let i = 0; i < numQ; i++) {
                            const qEnd = getQuarterEnd(cursor);
                            segments.push({
                                quarter: getQuarterLabel(cursor),
                                start: new Date(cursor),
                                end: qEnd,
                                days: Math.floor((qEnd - cursor) / (24 * 60 * 60 * 1000)) + 1,
                            });
                            cursor = getNextQuarterStart(cursor);
                        }
                        durStart = segments[0].start;
                        durEnd = segments[segments.length - 1].end;
                    } else {
                        // ── "today": charge pro-rata for remaining current quarter,
                        //    then numQ full quarters from next quarter (same as category ads) ──
                        const todayUTC = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
                        const currentQEnd = getQuarterEnd(todayUTC);
                        const remainingDays = Math.floor((currentQEnd - todayUTC) / (24 * 60 * 60 * 1000)) + 1;

                        // Full quarter length for pro-rata base
                        const qStartMonth = Math.floor(todayUTC.getUTCMonth() / 3) * 3;
                        const currentQStart = new Date(Date.UTC(todayUTC.getUTCFullYear(), qStartMonth, 1));
                        const fullQuarterDays = Math.floor((currentQEnd - currentQStart) / (24 * 60 * 60 * 1000)) + 1;

                        // Pro-rata = (remaining / full) × quarterly price for this slot
                        proRataCharge = Math.round((remainingDays / fullQuarterDays) * quarterlyPrice);

                        segments.push({
                            quarter: getQuarterLabel(todayUTC),
                            start: new Date(todayUTC),
                            end: currentQEnd,
                            days: remainingDays,
                        });
                        durStart = todayUTC;

                        // Then numQ full quarters from next quarter
                        let cursor = getNextQuarterStart(todayUTC);
                        for (let i = 0; i < numQ; i++) {
                            const qEnd = getQuarterEnd(cursor);
                            segments.push({
                                quarter: getQuarterLabel(cursor),
                                start: new Date(cursor),
                                end: qEnd,
                                days: Math.floor((qEnd - cursor) / (24 * 60 * 60 * 1000)) + 1,
                            });
                            cursor = getNextQuarterStart(cursor);
                        }
                        durEnd = segments[segments.length - 1].end;
                    }

                    const finalPrice = slotPrice + proRataCharge;
                    const totalDays = segments.reduce((sum, s) => sum + s.days, 0);

                    // Build breakdown — mirrors category: pro-rata segment + paid segments
                    let pricingBreakdown;
                    if (proRataCharge > 0 && segments.length > 1) {
                        const proRataSeg = segments[0];
                        const paidSegs = segments.slice(1);
                        const paidTotalDays = paidSegs.reduce((sum, s) => sum + s.days, 0);
                        const proRataRate = Math.round((proRataCharge / proRataSeg.days) * 100) / 100;
                        const paidRate = Math.round((slotPrice / paidTotalDays) * 100) / 100;
                        pricingBreakdown = [
                            {
                                quarter: proRataSeg.quarter, start: proRataSeg.start.toISOString(),
                                end: proRataSeg.end.toISOString(), days: proRataSeg.days,
                                rate_per_day: proRataRate, subtotal: proRataCharge,
                            },
                            ...paidSegs.map(s => ({
                                quarter: s.quarter, start: s.start.toISOString(), end: s.end.toISOString(),
                                days: s.days, rate_per_day: paidRate,
                                subtotal: Math.round((s.days / paidTotalDays) * slotPrice),
                            })),
                        ];
                    } else {
                        // Quarter-boundary start: uniform rate across all segments
                        const ratePerDay = totalDays > 0 ? Math.round((finalPrice / totalDays) * 100) / 100 : 0;
                        pricingBreakdown = segments.map(s => ({
                            quarter: s.quarter, start: s.start.toISOString(), end: s.end.toISOString(),
                            days: s.days, rate_per_day: ratePerDay,
                            subtotal: Math.round(ratePerDay * s.days),
                        }));
                    }

                    const quartersCovered = [...new Set(segments.map(s => s.quarter))];

                    return {
                        product_ad_request_id: requestDoc[0]._id,
                        slot: m.slot,
                        duration_days: totalDays,
                        status: 'pending',
                        start_date: durStart,
                        end_date: durEnd,
                        start_preference: pref,
                        selected_quarter: input.selected_quarter || null,
                        quarters_covered: quartersCovered,
                        pricing_breakdown: pricingBreakdown,
                        total_price: finalPrice,
                    };
                });
                await models.ProductAdRequestDuration.insertMany(durations, { session });

                await session.commitTransaction();
                session.endSession();

                console.log('[createProductAdRequest] Transaction committed OK');
                return requestDoc[0];
            } catch (err) {
                console.error('[createProductAdRequest] ERROR:', err.message);
                await session.abortTransaction();
                session.endSession();
                throw new Error('Failed to create product ad request: ' + err.message);
            }
        }
    ),

    // Admin approves a product ad request
    approveProductAdRequest: authenticate(['admin'])(
        async (_, { input }, { models, req }) => {
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                const { requestId, start_date } = input;

                const adRequest = await models.ProductAdRequest.findById(requestId)
                    .populate('product_id', 'fullName previewName')
                    .session(session);
                if (!adRequest) throw new Error('Product ad request not found');
                if (adRequest.status === 'rejected') throw new Error('Cannot approve a rejected request');
                if (adRequest.status === 'approved') throw new Error('Request already approved');

                // Load ALL duration docs (need slot names for pricing recalc + quarter info)
                const allDurations = await models.ProductAdRequestDuration.find({
                    product_ad_request_id: requestId
                }).lean();
                const firstDuration = allDurations[0] || null;

                const durationDays = firstDuration?.duration_days || 90;
                const selectedQuarter = firstDuration?.selected_quarter || null;

                // Determine actual start date:
                // Prefer admin-provided start_date, fall back to stored intended start
                let startDateObj;
                if (start_date) {
                    startDateObj = new Date(start_date);
                } else if (firstDuration?.start_date) {
                    startDateObj = new Date(firstDuration.start_date);
                } else {
                    startDateObj = new Date();
                }

                const msPerDay = 24 * 60 * 60 * 1000;

                // ─── Quarter-aware end date + pro-rata pricing recalculation ───────────────
                // When admin provides a start_date AND a selected_quarter exists:
                //   • Pin end_date to the LAST DAY of the selected quarter (not start + N days)
                //   • Recalculate each slot's price: (actualDays / fullQuarterDays) × quarterlyPrice
                // This way, if Q2 was booked but admin starts May 1, ad runs May 1–Jun 30 (61 days)
                // and the seller is charged for exactly those 61 days.
                let endDateObj;
                let totalCost;
                const updatedSlotPrices = {}; // durId → { price, days }

                if (selectedQuarter && start_date) {
                    // Parse the selected quarter (e.g. "Q2 2026" → qNum=2, qYear=2026)
                    const [qPart, yearPart] = selectedQuarter.split(' ');
                    const qNum = parseInt(qPart.replace('Q', ''), 10);
                    const qYear = parseInt(yearPart, 10);

                    // Validate: admin start must be within the selected quarter
                    const qStart = new Date(Date.UTC(qYear, (qNum - 1) * 3, 1));
                    const qEnd = new Date(Date.UTC(qYear, qNum * 3, 0, 23, 59, 59, 999));
                    if (startDateObj < qStart || startDateObj > qEnd) {
                        throw new Error(
                            `This ad was booked for ${selectedQuarter} (${qStart.toISOString().slice(0, 10)} – ${qEnd.toISOString().slice(0, 10)}). ` +
                            `Please set a start date within that quarter.`
                        );
                    }

                    // Pin end to quarter's last day
                    endDateObj = qEnd;

                    // Actual days the ad will run (start → quarter end, inclusive)
                    const actualDays = Math.floor((endDateObj - startDateObj) / msPerDay) + 1;
                    const fullQDays = Math.floor((qEnd - qStart) / msPerDay) + 1;

                    // Load pricing config to get each slot's quarterly rate
                    const pricingConfig = await AdPricingConfig.findOne(
                        { tier_id: adRequest.tier_id, is_active: true }
                    ).lean();

                    let costAccum = 0;
                    for (const dur of allDurations) {
                        const slotEntry = pricingConfig?.generated_prices?.find(p => p.slot_name === dur.slot);
                        const quarterlyRate = slotEntry?.quarterly || dur.total_price || 0;
                        const proRatedPrice = Math.round((actualDays / fullQDays) * quarterlyRate);
                        updatedSlotPrices[dur._id.toString()] = { price: proRatedPrice, days: actualDays };
                        costAccum += proRatedPrice;
                    }
                    totalCost = costAccum;

                } else if (firstDuration?.end_date && !start_date) {
                    // Admin did NOT override start → use stored intended end date and price
                    endDateObj = new Date(firstDuration.end_date);
                    totalCost = allDurations.reduce((sum, d) => sum + (d.total_price || 0), 0);

                    // Validate quarter if applicable (for logged history)
                    if (selectedQuarter) {
                        const [qPart, yearPart] = selectedQuarter.split(' ');
                        const qNum = parseInt(qPart.replace('Q', ''), 10);
                        const qYear = parseInt(yearPart, 10);
                        const qStart = new Date(Date.UTC(qYear, (qNum - 1) * 3, 1));
                        const qEnd = new Date(Date.UTC(qYear, qNum * 3, 0, 23, 59, 59, 999));
                        if (startDateObj < qStart || startDateObj > qEnd) {
                            throw new Error(
                                `This ad was booked for ${selectedQuarter} (${qStart.toISOString().slice(0, 10)} – ${qEnd.toISOString().slice(0, 10)}). ` +
                                `Please set a start date within that quarter.`
                            );
                        }
                    }

                } else {
                    // Old record (no selected_quarter) — keep current behaviour (start + durationDays)
                    endDateObj = new Date(startDateObj);
                    endDateObj.setUTCDate(endDateObj.getUTCDate() + durationDays - 1);
                    totalCost = allDurations.reduce((sum, d) => sum + (d.total_price || 0), 0);
                }

                console.log('[approveProductAdRequest] Total ad cost:', totalCost);

                // ── Update all duration entries (status, dates, and recalculated price if applicable) ──
                for (const dur of allDurations) {
                    const reCalc = updatedSlotPrices[dur._id.toString()];
                    await models.ProductAdRequestDuration.findByIdAndUpdate(
                        dur._id,
                        {
                            $set: {
                                status: 'approved',
                                start_date: startDateObj,
                                end_date: endDateObj,
                                ...(reCalc ? { total_price: reCalc.price, duration_days: reCalc.days } : {}),
                            }
                        },
                        { session }
                    );
                }

                // ── Check seller wallet balance ──
                const sellerId = adRequest.seller_id;
                let wallet = await SellerWallet.findOne({ seller_id: sellerId }).session(session);
                if (!wallet) {
                    wallet = (await SellerWallet.create([{ seller_id: sellerId, balance: 0 }], { session }))[0];
                }
                if (wallet.balance < totalCost) {
                    throw new Error(
                        `Insufficient wallet balance. Seller has ₹${wallet.balance} but ₹${totalCost} is required.`
                    );
                }

                // ── Deduct from wallet ──
                wallet.balance -= totalCost;
                await wallet.save({ session });
                console.log('[approveProductAdRequest] Wallet deducted. New balance:', wallet.balance);

                // ── Create debit transaction record ──
                const productName = adRequest.product_id?.fullName || adRequest.product_id?.previewName || 'Unknown';
                const slotNames = allDurations.map(d => d.slot).join(', ');
                await WalletTransaction.create([{
                    seller_id: sellerId,
                    type: 'debit',
                    amount: totalCost,
                    source: 'ad_deduction',
                    description: `Product ad approved for ${productName} (${slotNames})`,
                    status: 'success',
                }], { session });

                console.log('[approveProductAdRequest] Wallet transaction created');

                // ── Update request status + total_cost ──
                adRequest.status = 'approved';
                adRequest.approved_date = new Date();
                adRequest.total_cost = totalCost;
                await adRequest.save({ session });

                await session.commitTransaction();
                session.endSession();

                console.log('[approveProductAdRequest] Approved request:', requestId, '— Deducted ₹' + totalCost);

                return {
                    success: true,
                    message: `Product ad approved. ₹${totalCost} deducted from seller wallet.`,
                    data: adRequest
                };
            } catch (err) {
                console.error('[approveProductAdRequest] error:', err);
                await session.abortTransaction();
                session.endSession();
                return { success: false, message: err.message, data: null };
            }
        }
    ),

    // Admin rejects a product ad request
    rejectProductAdRequest: authenticate(['admin'])(
        async (_, { input }, { models, req }) => {
            try {
                const { requestId, rejection_reason } = input;

                const adRequest = await models.ProductAdRequest.findById(requestId);
                if (!adRequest) throw new Error('Product ad request not found');

                adRequest.status = 'rejected';
                adRequest.rejection_reason = rejection_reason || 'No reason provided';
                await adRequest.save();

                // Also mark all duration records as rejected so the slots are freed immediately
                await models.ProductAdRequestDuration.updateMany(
                    { product_ad_request_id: requestId },
                    { $set: { status: 'rejected' } }
                );

                console.log('[rejectProductAdRequest] Rejected request:', requestId);

                return {
                    success: true,
                    message: 'Product ad request rejected',
                    data: adRequest
                };
            } catch (err) {
                console.error('[rejectProductAdRequest] error:', err);
                return { success: false, message: err.message, data: null };
            }
        }
    ),

    // Admin assigns an ad tier directly to a product
    setProductAdTier: authenticate(['admin'])(
        async (_, { productId, tierId }, { models }) => {
            try {
                const product = await models.Product.findById(productId);
                if (!product) throw new Error('Product not found');

                const tier = await models.AdTierMaster.findById(tierId);
                if (!tier) throw new Error('Tier not found');

                product.adTierId = tierId;
                await product.save();

                console.log('[setProductAdTier] Set tier', tierId, 'for product', productId);
                return { success: true, message: `Tier "${tier.name}" assigned to product successfully` };
            } catch (err) {
                console.error('[setProductAdTier] error:', err);
                return { success: false, message: err.message };
            }
        }
    )
};
