// src/controller/ccavWalletResponseHandler.js
// Handles CCAvenue response callbacks for wallet top-up payments.
// Modelled after ccavResponseHandler.js — reuses existing ccavutil.js decrypt.
import { decrypt } from "../middlewares/ccavutil.js";
import { parse } from "querystring";
import StoreFeature from "../models/StoreFeature.js";
import WalletTransaction from "../models/WalletTransaction.js";
import SellerWallet from "../models/SellerWallet.js";
import User from "../models/User.js";
import { createWalletInvoice } from "../services/walletInvoiceService.js";

// Determine the wallet redirect base path based on the user's role.
// Ads Associates are redirected to /adsassociate/wallet, everyone else to /seller/wallet.
async function getWalletPath(sellerId) {
    try {
        const user = await User.findById(sellerId).select("role").lean();
        if (user && user.role && (user.role.includes("adManager") || user.role.includes("adsAssociate"))) {
            return "/adsassociate/wallet";
        }
    } catch (e) {
        console.error("[getWalletPath] error looking up user role:", e);
    }
    return "/seller/wallet";
}

export async function walletRes(request, response) {
    let ccavEncResponse = "";
    let ccavResponse = "";

    return new Promise((resolve, reject) => {
        request.on("data", function (data) {
            ccavEncResponse += data;
            const ccavPOST = parse(ccavEncResponse);
            const encryption = ccavPOST.encResp;
            const master_placeholder = { ccKey: null }; // will be populated below
            // Store encryption for use in 'end' handler
            request._encryptedResponse = encryption;
        });

        request.on("end", async function () {
            try {
                const master = await StoreFeature.findOne({});
                const workingKey = master.ccKey;

                const encryption = request._encryptedResponse;
                if (!encryption) {
                    console.error("[walletRes] No encrypted response received");
                    response.redirect(302, process.env.WALLET_FAILURE_URL || "/seller/wallet?status=failed");
                    return resolve();
                }

                ccavResponse = decrypt(encryption, workingKey);

                function convertResponseToJSON(responseString) {
                    const keyValuePairs = responseString.split("&");
                    const result = {};
                    keyValuePairs.forEach((pair) => {
                        const [key, value] = pair.split("=");
                        result[key] = decodeURIComponent(value.replace(/\+/g, " "));
                    });
                    return result;
                }

                const jsonResponse = convertResponseToJSON(ccavResponse);
                const ccavOrderId = jsonResponse.order_id; // This is WalletTransaction._id

                // Look up the pending WalletTransaction
                const transaction = await WalletTransaction.findById(ccavOrderId);
                if (!transaction) {
                    console.error("[walletRes] WalletTransaction not found for order_id:", ccavOrderId);
                    response.redirect(302, process.env.WALLET_FAILURE_URL || "/seller/wallet?status=failed");
                    return resolve();
                }

                // Determine redirect path based on user role (adsAssociate/adManager → /adsassociate/wallet, else /seller/wallet)
                const walletPath = await getWalletPath(transaction.seller_id);

                if (jsonResponse.order_status === "Success") {
                    // Mark transaction as success and update CCAvenue correlation fields
                    transaction.status = "success";
                    transaction.ccav_tracking_id = jsonResponse.tracking_id || "";
                    transaction.ccav_payment_mode = jsonResponse.payment_mode || "";

                    // Generate invoice with GST data from the pending transaction
                    const user = await User.findById(transaction.seller_id).lean();
                    if (user) {
                        await createWalletInvoice({
                            transaction,
                            user,
                            paymentMode: jsonResponse.payment_mode || "",
                            gatewayTransactionId: jsonResponse.tracking_id || "",
                            gstData: transaction.gstType ? {
                                baseAmount:   transaction.amount,
                                gstRate:      18,
                                gstType:      transaction.gstType,
                                cgstRate:     transaction.gstType === 'cgst_sgst' ? 9 : 0,
                                cgstAmount:   transaction.gstType === 'cgst_sgst' ? Math.round(transaction.amount * 0.09) : 0,
                                sgstRate:     transaction.gstType === 'cgst_sgst' ? 9 : 0,
                                sgstAmount:   transaction.gstType === 'cgst_sgst' ? Math.round(transaction.amount * 0.09) : 0,
                                igstRate:     transaction.gstType === 'igst' ? 18 : 0,
                                igstAmount:   transaction.gstType === 'igst' ? Math.round(transaction.amount * 0.18) : 0,
                                totalAmount:  transaction.totalCharged || (transaction.amount + Math.round(transaction.amount * 0.18)),
                                buyerState:   transaction.buyerState   || null,
                                companyState: transaction.companyState || null,
                            } : null,
                        });
                    } else {
                        console.warn("[walletRes] User not found for invoice generation, seller_id:", transaction.seller_id);
                    }

                    await transaction.save();

                    // Atomically increment the seller's wallet balance
                    await SellerWallet.findOneAndUpdate(
                        { seller_id: transaction.seller_id },
                        { $inc: { balance: transaction.amount } },
                        { upsert: true, new: true }
                    );

                    console.log(
                        `[walletRes] Wallet credited: seller=${transaction.seller_id}, amount=${transaction.amount}`
                    );
                    response.redirect(302, process.env.WALLET_SUCCESS_URL || `${walletPath}?status=success`);
                } else {
                    // Payment failed or cancelled
                    transaction.status = "failed";
                    transaction.ccav_tracking_id = jsonResponse.tracking_id || "";
                    transaction.ccav_payment_mode = jsonResponse.payment_mode || "";
                    await transaction.save();

                    console.log(
                        `[walletRes] Wallet payment failed: seller=${transaction.seller_id}, status=${jsonResponse.order_status}`
                    );
                    response.redirect(302, process.env.WALLET_FAILURE_URL || `${walletPath}?status=failed`);
                }

                response.end();
                resolve();
            } catch (error) {
                console.error("[walletRes] error:", error);
                reject(error);
            }
        });

        request.on("error", function (error) {
            console.error("[walletRes] Request error:", error);
            response.writeHead(500, { "Content-Type": "text/plain" });
            response.end("Internal Server Error");
            reject(error);
        });
    });
}
