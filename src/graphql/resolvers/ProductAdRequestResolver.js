import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import authenticate from '../../middlewares/auth.js';

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
                            mobile_image_url: m.mobile_image_url,
                            desktop_image_url: m.desktop_image_url,
                            redirect_url: m.redirect_url || m.mobile_redirect_url || m.desktop_redirect_url
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
                            mobile_image_url: m.mobile_image_url,
                            desktop_image_url: m.desktop_image_url,
                            redirect_url: m.redirect_url || m.mobile_redirect_url || m.desktop_redirect_url
                        })),
                        durations: (durationsMap[reqId] || []).map(d => ({
                            id: d._id?.toString(),
                            slot: d.slot,
                            duration_days: d.duration_days,
                            start_date: d.start_date ? new Date(d.start_date).toISOString() : null,
                            end_date: d.end_date ? new Date(d.end_date).toISOString() : null,
                            status: d.status
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

    // ─── PUBLIC ────────────────────────────────────────────────────────────────
    // List all products with slot availability (for seller to pick a product to advertise)
    getProductsWithAvailableAdSlots: async (_, __, { models }) => {
        try {
            const products = await models.Product.find({ approve: true, active: true })
                .select('fullName previewName brand_name thumbnail')
                .lean();

            if (!products || products.length === 0) return [];

            // Batch fetch all requests and durations
            const allRequests = await models.ProductAdRequest.find()
                .select('_id product_id')
                .lean();

            const allDurations = await models.ProductAdRequestDuration.find({
                status: { $in: ['running', 'approved'] }
            })
                .select('product_ad_request_id slot')
                .lean();

            // Map: requestId → productId
            const requestToProduct = {};
            allRequests.forEach(r => {
                requestToProduct[r._id.toString()] = r.product_id.toString();
            });

            // Map: productId → booked slots
            const slotsByProduct = {};
            allDurations.forEach(d => {
                const productId = requestToProduct[d.product_ad_request_id.toString()];
                if (!productId) return;
                if (!slotsByProduct[productId]) slotsByProduct[productId] = [];
                slotsByProduct[productId].push(d.slot);
            });

            const slotNames = ['banner_1', 'banner_2', 'banner_3', 'banner_4', 'stamp_1', 'stamp_2', 'stamp_3', 'stamp_4'];

            return products.map(p => {
                const pid = p._id.toString();
                const bookedSlots = slotsByProduct[pid] || [];
                const bookedBanner = bookedSlots.filter(s => s.startsWith('banner_')).length;
                const bookedStamp = bookedSlots.filter(s => s.startsWith('stamp_')).length;
                const bookedCount = bookedSlots.length;

                return {
                    id: pid,
                    productName: p.fullName || p.previewName || 'Unknown',
                    brandName: p.brand_name || null,
                    thumbnail: p.thumbnail || null,
                    availableSlots: Math.max(0, 8 - bookedCount),
                    bookedSlots: bookedCount,
                    bookedBanner,
                    bookedStamp,
                    slotStatuses: slotNames.map(slot => ({
                        slot,
                        available: !bookedSlots.includes(slot)
                    }))
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
                status: 'approved'
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

            const now = new Date();
            return approvedRequests
                .map(r => {
                    const reqId = r._id.toString();
                    const durations = durationsMap[reqId] || [];
                    const isRunning = durations.some(d => {
                        if (d.status !== 'approved') return false;
                        const start = d.start_date ? new Date(d.start_date) : null;
                        const end = d.end_date ? new Date(d.end_date) : null;
                        if (start && end) return now >= start && now <= end;
                        return true; // fallback: no dates set but approved
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
        const approvedRequests = await models.ProductAdRequest.find({ status: 'approved' })
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
                        mobile_image_url: m.mobile_image_url,
                        desktop_image_url: m.desktop_image_url,
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

                // Verify product exists
                const product = await models.Product.findById(input.product_id)
                    .populate('categories')
                    .lean();
                if (!product) throw new Error('Product not found');

                // Auto-inherit tier from the product's first parent category
                let tierId = null;
                if (product.categories && product.categories.length > 0) {
                    // categories may be ObjectIds or populated objects
                    let category = null;
                    for (const cat of product.categories) {
                        const catId = cat._id || cat;
                        const catDoc = await models.Category.findById(catId).populate('adTierId').lean();
                        if (catDoc && catDoc.adTierId) {
                            category = catDoc;
                            break;
                        }
                    }
                    if (category) {
                        tierId = category.adTierId._id;
                    }
                }
                if (!tierId) {
                    throw new Error("No ad tier found for this product's category. Please contact admin to configure a tier for the product's category.");
                }

                console.log('[createProductAdRequest] Resolved tier:', tierId);

                // Check slot availability for this product (8 slots per product)
                const existingRequests = await models.ProductAdRequest.find({
                    product_id: input.product_id
                })
                    .select('_id')
                    .lean();

                const existingIds = existingRequests.map(r => r._id);
                const bookedCount = existingIds.length > 0
                    ? await models.ProductAdRequestDuration.countDocuments({
                        product_ad_request_id: { $in: existingIds },
                        status: { $in: ['running', 'approved'] }
                    })
                    : 0;

                if (bookedCount >= 8) throw new Error('No slots available for this product');

                console.log('[createProductAdRequest] Booked slots for product:', bookedCount, '/ 8');

                // Create the request
                const requestDoc = await models.ProductAdRequest.create(
                    [{
                        seller_id: sellerId,
                        product_id: input.product_id,
                        tier_id: tierId,
                        status: 'pending'
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

                // Create duration entries
                const durations = input.medias.map(m => ({
                    product_ad_request_id: requestDoc[0]._id,
                    slot: m.slot,
                    duration_days: input.duration_days || 30,
                    status: 'pending',
                    start_date: null,
                    end_date: null
                }));
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
            try {
                const { requestId, start_date } = input;

                const adRequest = await models.ProductAdRequest.findById(requestId);
                if (!adRequest) throw new Error('Product ad request not found');
                if (adRequest.status === 'rejected') throw new Error('Cannot approve a rejected request');

                // Calculate end_date from the first duration entry's duration_days
                const firstDuration = await models.ProductAdRequestDuration.findOne({
                    product_ad_request_id: requestId
                }).lean();

                const durationDays = firstDuration?.duration_days || 30;
                const startDateObj = new Date(start_date);
                const endDateObj = new Date(startDateObj);
                endDateObj.setDate(endDateObj.getDate() + durationDays);

                // Update all duration entries for this request
                await models.ProductAdRequestDuration.updateMany(
                    { product_ad_request_id: requestId },
                    {
                        $set: {
                            status: 'approved',
                            start_date: startDateObj,
                            end_date: endDateObj
                        }
                    }
                );

                // Update the request status
                adRequest.status = 'approved';
                adRequest.approved_date = new Date();
                await adRequest.save();

                console.log('[approveProductAdRequest] Approved request:', requestId);

                return {
                    success: true,
                    message: 'Product ad request approved successfully',
                    data: adRequest
                };
            } catch (err) {
                console.error('[approveProductAdRequest] error:', err);
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
    )
};
