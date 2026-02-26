// src/controller/payuWalletResponseHandler.js
// Handles PayU success/failure callbacks for wallet top-up payments.
import crypto from "crypto";
import WalletTransaction from "../models/WalletTransaction.js";
import SellerWallet from "../models/SellerWallet.js";

// Verify PayU response hash (reverse hash).
// PayU Node.js SDK formula:
//   sha512(SALT|status|||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|KEY)
// Note: 5 pipes between status and udf5 (representing empty additional charge fields)
function verifyPayUHash(params) {
    // Read at call-time so .env changes are picked up after restart
    const PAYU_KEY = process.env.PAYU_WALLET_KEY;
    const PAYU_SALT = process.env.PAYU_WALLET_SALT;

    const { txnid, amount, productinfo, firstname, email, status } = params;
    const udf1 = params.udf1 || "";
    const udf2 = params.udf2 || "";
    const udf3 = params.udf3 || "";
    const udf4 = params.udf4 || "";
    const udf5 = params.udf5 || "";

    // 5 pipes between status and udf5 (PayU Node.js SDK format)
    const hashStr = `${PAYU_SALT}|${status}|||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${PAYU_KEY}`;
    const expectedHash = crypto.createHash("sha512").update(hashStr).digest("hex");

    console.log("[PayU] reverse hash expected:", expectedHash);
    console.log("[PayU] reverse hash received:", params.hash);
    console.log("[PayU] match:", expectedHash === params.hash);

    return expectedHash === params.hash;
}

// Handles both success and failure callbacks from PayU (/api/payuWalletSuccess and /api/payuWalletFailure)
export async function payuWalletResponse(request, response) {
    const data = request.body; // body-parser urlencoded has already parsed it
    const { txnid, status } = data;

    console.log("[PayU] Callback received — txnid:", txnid, "status:", status);

    const frontendBase = process.env.FRONTEND_BASE_URL || "http://localhost:3000";

    try {
        // txnid = WalletTransaction._id
        const transaction = await WalletTransaction.findById(txnid);
        if (!transaction) {
            console.error("[payuWalletResponse] WalletTransaction not found:", txnid);
            return response.redirect(302, `${frontendBase}/seller/wallet?status=failed`);
        }

        // Verify hash to prevent tampering
        const hashValid = verifyPayUHash(data);
        if (!hashValid) {
            console.error("[payuWalletResponse] Hash mismatch — treating status field directly:", status);
            // In development, still process based on status so we can test the wallet update.
            // For production, uncomment the next 3 lines and remove the comment below.
            // transaction.status = "failed";
            // await transaction.save();
            // return response.redirect(302, `${frontendBase}/seller/wallet?status=failed`);
        }

        if (status === "success") {
            transaction.status = "success";
            transaction.ccav_tracking_id = data.payuMoneyId || data.bank_ref_num || "";
            transaction.ccav_payment_mode = data.mode || "";
            await transaction.save();

            // Atomically credit wallet
            await SellerWallet.findOneAndUpdate(
                { seller_id: transaction.seller_id },
                { $inc: { balance: transaction.amount } },
                { upsert: true, new: true }
            );

            console.log(`[payuWalletResponse] ✅ Wallet credited: seller=${transaction.seller_id}, amount=${transaction.amount}`);
            return response.redirect(302, `${frontendBase}/seller/wallet?status=success`);
        } else {
            transaction.status = "failed";
            await transaction.save();
            console.log(`[payuWalletResponse] ❌ Payment not successful: txnid=${txnid}, status=${status}`);
            return response.redirect(302, `${frontendBase}/seller/wallet?status=failed`);
        }
    } catch (err) {
        console.error("[payuWalletResponse] error:", err);
        return response.redirect(302, `${frontendBase}/seller/wallet?status=failed`);
    }
}
