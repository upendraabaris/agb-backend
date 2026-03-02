// src/graphql/resolvers/WalletResolver.js
import jwt from "jsonwebtoken";
import crypto from "crypto";
import authenticate from "../../middlewares/auth.js";

// Generate PayU forward hash:
// sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
function generatePayUHash({ txnid, amount, productinfo, firstname, email, key, salt }) {
    const hashStr = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
    console.log("[PayU] hash input string:", hashStr);
    return crypto.createHash("sha512").update(hashStr).digest("hex");
}

export const Query = {
    // Returns current seller's wallet balance + last 10 transactions
    getMyWallet: authenticate(["seller"])(async (_, __, { models, req }) => {
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
                    createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
                })),
            };
        } catch (err) {
            console.error("[getMyWallet] error:", err);
            throw err;
        }
    }),

    // Paginated transaction history for the logged-in seller
    getWalletTransactions: authenticate(["seller"])(
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
                    createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
                }));
            } catch (err) {
                console.error("[getWalletTransactions] error:", err);
                throw err;
            }
        }
    ),
};

export const Mutation = {
    // Creates a pending WalletTransaction, generates PayU hash server-side,
    // and returns all fields the frontend needs to POST to PayU.
    initiateWalletPayment: authenticate(["seller"])(
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
};
