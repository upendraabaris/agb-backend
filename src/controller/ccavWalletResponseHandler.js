// src/controller/ccavWalletResponseHandler.js
// Handles CCAvenue response callbacks for wallet top-up payments.
// Modelled after ccavResponseHandler.js — reuses existing ccavutil.js decrypt.
import { decrypt } from "../middlewares/ccavutil.js";
import { parse } from "querystring";
import StoreFeature from "../models/StoreFeature.js";
import WalletTransaction from "../models/WalletTransaction.js";
import SellerWallet from "../models/SellerWallet.js";

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

                if (jsonResponse.order_status === "Success") {
                    // Mark transaction as success and update CCAvenue correlation fields
                    transaction.status = "success";
                    transaction.ccav_tracking_id = jsonResponse.tracking_id || "";
                    transaction.ccav_payment_mode = jsonResponse.payment_mode || "";
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
                    response.redirect(302, process.env.WALLET_SUCCESS_URL || "/seller/wallet?status=success");
                } else {
                    // Payment failed or cancelled
                    transaction.status = "failed";
                    transaction.ccav_tracking_id = jsonResponse.tracking_id || "";
                    transaction.ccav_payment_mode = jsonResponse.payment_mode || "";
                    await transaction.save();

                    console.log(
                        `[walletRes] Wallet payment failed: seller=${transaction.seller_id}, status=${jsonResponse.order_status}`
                    );
                    response.redirect(302, process.env.WALLET_FAILURE_URL || "/seller/wallet?status=failed");
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