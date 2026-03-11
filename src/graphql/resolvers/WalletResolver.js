// src/graphql/resolvers/WalletResolver.js
import jwt from "jsonwebtoken";
import crypto from "crypto";
import authenticate from "../../middlewares/auth.js";
import { createWalletInvoice as _createInvoiceForTransaction, generateInvoiceNumber as _generateInvoiceNumber } from "../../services/walletInvoiceService.js";

// Generate PayU forward hash:
// sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
function generatePayUHash({ txnid, amount, productinfo, firstname, email, key, salt }) {
    const hashStr = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
    console.log("[PayU] hash input string:", hashStr);
    return crypto.createHash("sha512").update(hashStr).digest("hex");
}

export const Query = {
    // Returns current seller's wallet balance + last 10 transactions
    getMyWallet: authenticate(["seller", "adManager"])(async (_, __, { models, req }) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) throw new Error("Authorization header missing");
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // decoded._id is User._id — same pattern used by all other resolvers
            // (CategoryRequestResolver, AdReportingResolver, etc.)
            const sellerId = decoded._id;

            // Find or create wallet document for this seller
            let wallet = await models.SellerWallet.findOne({ seller_id: sellerId });
            if (!wallet) {
                wallet = await models.SellerWallet.create({ seller_id: sellerId, balance: 0 });
            }

            // Fetch last 10 transactions
            const transactions = await models.WalletTransaction.find({ seller_id: sellerId })
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();

            return {
                id: wallet._id.toString(),
                balance: wallet.balance,
                recentTransactions: transactions.map((t) => ({
                    id: t._id.toString(),
                    type: t.type,
                    amount: t.amount,
                    source: t.source,
                    description: t.description || null,
                    status: t.status,
                    ccav_tracking_id: t.ccav_tracking_id || null,
                    invoice_id: t.invoice_id ? t.invoice_id.toString() : null,
                    createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
                })),
            };
        } catch (err) {
            console.error("[getMyWallet] error:", err);
            throw err;
        }
    }),

    // Paginated transaction history for the logged-in seller
    getWalletTransactions: authenticate(["seller", "adManager"])(
        async (_, { limit = 20, offset = 0 }, { models, req }) => {
            try {
                const authHeader = req.headers.authorization;
                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const sellerId = decoded._id;

                const transactions = await models.WalletTransaction.find({ seller_id: sellerId })
                    .sort({ createdAt: -1 })
                    .skip(offset)
                    .limit(limit)
                    .lean();

                return transactions.map((t) => ({
                    id: t._id.toString(),
                    type: t.type,
                    amount: t.amount,
                    source: t.source,
                    description: t.description || null,
                    status: t.status,
                    ccav_tracking_id: t.ccav_tracking_id || null,
                    invoice_id: t.invoice_id ? t.invoice_id.toString() : null,
                    createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
                }));
            } catch (err) {
                console.error("[getWalletTransactions] error:", err);
                throw err;
            }
        }
    ),
    // Returns the WalletInvoice for a given successful top-up transaction
    getWalletInvoice: authenticate(["seller", "adManager"])(
        async (_, { transactionId }, { models, req }) => {
            try {
                const authHeader = req.headers.authorization;
                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const sellerId = decoded._id;

                const invoice = await models.WalletInvoice.findOne({
                    transaction_id: transactionId,
                    seller_id: sellerId, // ensure the caller owns this invoice
                }).lean();

                if (!invoice) return null;

                return {
                    id: invoice._id.toString(),
                    invoiceNumber: invoice.invoiceNumber,
                    seller_id: invoice.seller_id.toString(),
                    transaction_id: invoice.transaction_id.toString(),
                    amount: invoice.amount,
                    gatewayTransactionId: invoice.gatewayTransactionId || null,
                    paymentMode: invoice.paymentMode || null,
                    paymentGateway: invoice.paymentGateway,
                    description: invoice.description || null,
                    buyerName: invoice.buyerName || null,
                    buyerEmail: invoice.buyerEmail || null,
                    buyerPhone: invoice.buyerPhone || null,
                    createdAt: invoice.createdAt ? new Date(invoice.createdAt).toISOString() : null,
                };
            } catch (err) {
                console.error("[getWalletInvoice] error:", err);
                throw err;
            }
        }
    ),

    // Paginated list of all wallet top-up invoices for the logged-in seller
    getWalletInvoices: authenticate(["seller", "adManager"])(
        async (_, { limit = 20, offset = 0 }, { models, req }) => {
            try {
                const authHeader = req.headers.authorization;
                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const sellerId = decoded._id;

                const invoices = await models.WalletInvoice.find({ seller_id: sellerId })
                    .sort({ createdAt: -1 })
                    .skip(offset)
                    .limit(limit)
                    .lean();

                return invoices.map((invoice) => ({
                    id: invoice._id.toString(),
                    invoiceNumber: invoice.invoiceNumber,
                    seller_id: invoice.seller_id.toString(),
                    transaction_id: invoice.transaction_id.toString(),
                    amount: invoice.amount,
                    gatewayTransactionId: invoice.gatewayTransactionId || null,
                    paymentMode: invoice.paymentMode || null,
                    paymentGateway: invoice.paymentGateway,
                    description: invoice.description || null,
                    buyerName: invoice.buyerName || null,
                    buyerEmail: invoice.buyerEmail || null,
                    buyerPhone: invoice.buyerPhone || null,
                    createdAt: invoice.createdAt ? new Date(invoice.createdAt).toISOString() : null,
                }));
            } catch (err) {
                console.error("[getWalletInvoices] error:", err);
                throw err;
            }
        }
    ),
};

// ──────────────────────────────────────────────────────────────────────────────

export const Mutation = {
    // Creates a pending WalletTransaction, generates PayU hash server-side,
    // and returns all fields the frontend needs to POST to PayU.
    initiateWalletPayment: authenticate(["seller", "adManager"])(
        async (_, { amount }, { models, req }) => {
            try {
                const authHeader = req.headers.authorization;
                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const sellerId = decoded._id; // User._id — consistent with rest of codebase

                if (!amount || amount <= 0) {
                    throw new Error("Amount must be greater than zero");
                }

                // Fetch user info for PayU form fields (firstname, email, phone)
                const user = await models.User.findById(sellerId).lean();
                if (!user) throw new Error("User not found");

                const firstname = user.firstName || "Seller";
                const email = user.email || "";
                // PayU requires exactly 10-digit phone; strip country code prefix if present
                const rawPhone = user.mobileNo || "";
                const phone = rawPhone.replace(/\D/g, "").slice(-10);

                // Read PayU credentials at request time (not module load) to pick up .env changes
                const payuKey = process.env.PAYU_WALLET_KEY;
                const payuSalt = process.env.PAYU_WALLET_SALT;
                if (!payuKey || !payuSalt) {
                    throw new Error("PayU credentials not configured. Add PAYU_WALLET_KEY and PAYU_WALLET_SALT to backend .env");
                }

                // Create a pending transaction — its _id is used as PayU txnid
                const transaction = await models.WalletTransaction.create({
                    seller_id: sellerId,
                    type: "credit",
                    amount,
                    source: "payu",
                    description: "Wallet top-up via PayU",
                    status: "pending",
                });

                const txnid = transaction._id.toString();
                const productinfo = "Wallet Top-up";

                // Generate PayU forward hash (must be done server-side to keep salt secret)
                const hash = generatePayUHash({
                    txnid,
                    amount: amount.toFixed(2),
                    productinfo,
                    firstname,
                    email,
                    key: payuKey,
                    salt: payuSalt,
                });

                return {
                    success: true,
                    transactionId: txnid,
                    amount,
                    hash,
                    key: payuKey,
                    productinfo,
                    firstname,
                    email,
                    phone,
                };
            } catch (err) {
                console.error("[initiateWalletPayment] error:", err);
                throw err;
            }
        }
    ),

    // Seller-facing: generate (or return existing) invoice for a single successful top-up.
    generateWalletInvoice: authenticate(["seller", "adManager"])(
        async (_, { transactionId }, { models, req }) => {
            try {
                const authHeader = req.headers.authorization;
                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const sellerId = decoded._id;

                const transaction = await models.WalletTransaction.findOne({
                    _id: transactionId,
                    seller_id: sellerId, // ownership check
                    type: "credit",
                    source: { $in: ["payu", "ccavenue"] },
                    status: "success",
                });
                if (!transaction) throw new Error("Transaction not found or not eligible for invoice");

                // Fetch company (StoreFeature) and buyer (Seller profile) details in parallel
                const [storeFeature, seller] = await Promise.all([
                    models.StoreFeature.findOne({}).lean(),
                    models.Seller.findOne({ user: sellerId }).lean(),
                ]);

                const buildBuyerAddress = (s) => {
                    if (!s) return null;
                    const parts = [s.fullAddress || s.address, s.city, s.state, s.pincode].filter(Boolean);
                    return parts.join(", ") || null;
                };

                const buildCompanyAddress = (sf) => {
                    if (!sf) return null;
                    const parts = [sf.storeBusinessAddress, sf.storeBusinessCity, sf.storeBusinessState].filter(Boolean);
                    return parts.join(", ") || null;
                };

                const buildResponse = (inv) => ({
                    id: inv._id.toString(),
                    invoiceNumber: inv.invoiceNumber,
                    seller_id: inv.seller_id.toString(),
                    transaction_id: inv.transaction_id.toString(),
                    amount: inv.amount,
                    gatewayTransactionId: inv.gatewayTransactionId || null,
                    paymentMode: inv.paymentMode || null,
                    paymentGateway: inv.paymentGateway,
                    description: inv.description || null,
                    buyerName: inv.buyerName || null,
                    buyerEmail: inv.buyerEmail || null,
                    buyerPhone: inv.buyerPhone || null,
                    buyerAddress: buildBuyerAddress(seller),
                    buyerGstin: seller?.gstin || null,
                    companyName: storeFeature?.storeBusinessName || null,
                    companyAddress: buildCompanyAddress(storeFeature),
                    companyPan: storeFeature?.storeBusinessPanNo || null,
                    companyGstin: storeFeature?.storeBusinessGstin || null,
                    companyWebsite: storeFeature?.storeName || null,
                    createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString() : null,
                });

                // Return existing invoice if already generated
                const existing = await models.WalletInvoice.findOne({ transaction_id: transaction._id }).lean();
                if (existing) {
                    if (!transaction.invoice_id) {
                        transaction.invoice_id = existing._id;
                        await transaction.save();
                    }
                    return buildResponse(existing);
                }

                // Generate a new invoice
                const user = await models.User.findById(sellerId).lean();
                if (!user) throw new Error("User not found");

                const invoice = await _createInvoiceForTransaction({
                    transaction,
                    user,
                    paymentMode: transaction.ccav_payment_mode || "",
                    gatewayTransactionId: transaction.ccav_tracking_id || "",
                });
                if (!invoice) throw new Error("Failed to generate invoice. Please try again.");

                return buildResponse(invoice);
            } catch (err) {
                console.error("[generateWalletInvoice] error:", err);
                throw err;
            }
        }
    ),

    // Admin-only: generate invoices for all successful top-up transactions missing one.
    // Processes transactions one at a time to keep invoice numbers sequential.
    backfillWalletInvoices: authenticate(["admin", "masterAdmin"])(
        async (_, __, { models }) => {
            const orphans = await models.WalletTransaction.find({
                type: "credit",
                source: { $in: ["payu", "ccavenue"] },
                status: "success",
                invoice_id: { $exists: false },
            }).lean();

            let processed = 0;
            let failed = 0;

            for (const txDoc of orphans) {
                try {
                    // Guard: skip if an invoice was already created by a concurrent call
                    const existing = await models.WalletInvoice.findOne({ transaction_id: txDoc._id }).lean();
                    if (existing) {
                        await models.WalletTransaction.updateOne(
                            { _id: txDoc._id },
                            { $set: { invoice_id: existing._id } }
                        );
                        processed++;
                        continue;
                    }

                    const user = await models.User.findById(txDoc.seller_id).lean();
                    if (!user) {
                        console.warn(`[backfillWalletInvoices] User not found for tx ${txDoc._id}`);
                        failed++;
                        continue;
                    }

                    // Use a mutable copy so the service can set invoice_id and save it
                    const txMutable = await models.WalletTransaction.findById(txDoc._id);
                    await _createInvoiceForTransaction({
                        transaction: txMutable,
                        user,
                        paymentMode: txMutable.ccav_payment_mode || "",
                        gatewayTransactionId: txMutable.ccav_tracking_id || "",
                    });
                    processed++;
                    console.log(`[backfillWalletInvoices] ✅ Invoice created for tx ${txDoc._id}`);
                } catch (err) {
                    console.error(`[backfillWalletInvoices] ❌ Failed for tx ${txDoc._id}:`, err.message);
                    failed++;
                }
            }

            console.log(`[backfillWalletInvoices] Done — processed: ${processed}, failed: ${failed}`);
            return { processed, failed };
        }
    ),
};
