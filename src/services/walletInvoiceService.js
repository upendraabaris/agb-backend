// src/services/walletInvoiceService.js
// Shared invoice generation logic used by both the PayU/CCAvenue callback controllers
// and the GraphQL backfill mutation.
import WalletInvoice from "../models/WalletInvoice.js";
import StoreFeature from "../models/StoreFeature.js";

function getCurrentFinancialYear() {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed; March = 2
  const year = now.getFullYear();
  // April (month 3) onward → FY starts this calendar year
  if (month >= 3) {
    return `${String(year).slice(-2)}${String(year + 1).slice(-2)}`;
  }
  // Jan–Mar → FY started previous calendar year
  return `${String(year - 1).slice(-2)}${String(year).slice(-2)}`;
}

/**
 * Generates next invoice number in format: SE/AD/{sellerBillFormate}/{FY}/{seq}
 * e.g. SE/AD/B/2526/001
 * Sequence is 3 digits and resets to 001 at the start of each new financial year.
 */
export async function generateInvoiceNumber() {
  const fy = getCurrentFinancialYear();

  // Fetch the bill format character from StoreFeature (single-row config document)
  const storeFeature = await StoreFeature.findOne({}).lean();
  const billFormat = storeFeature?.sellerBillFormate || "B";

  // Prefix is FY-scoped → sequence naturally resets when the FY changes
  const prefix = `WINV/${billFormat}/${fy}/`;

  const latestInvoice = await WalletInvoice.findOne(
    { invoiceNumber: { $regex: `^${prefix}` } },
    {},
    { sort: { _id: -1 } }
  ).lean();

  let seq = 1;
  if (latestInvoice) {
    const parts = latestInvoice.invoiceNumber.split("/");
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  // 3-digit sequence: 001, 002, …, 999
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

/**
 * Creates a WalletInvoice for a successful top-up and back-links it on the transaction.
 * Failures are logged and never block wallet crediting.
 *
 * @param {object} opts
 * @param {import("mongoose").Document} opts.transaction  - The WalletTransaction mongoose doc (mutable)
 * @param {object}  opts.user                             - Lean User document
 * @param {string}  [opts.paymentMode]
 * @param {string}  [opts.gatewayTransactionId]
 * @param {object}  [opts.gstData]  - GST breakdown (optional, for new invoices)
 * @returns {Promise<import("mongoose").Document|null>}
 */
export async function createWalletInvoice({ transaction, user, paymentMode = "", gatewayTransactionId = "", gstData = null }) {
  try {
    const invoiceNumber = await generateInvoiceNumber();
    const rawPhone = (user.mobileNo || "").replace(/\D/g, "").slice(-10);

    const gstFields = gstData ? {
      baseAmount:   gstData.baseAmount,
      gstRate:      gstData.gstRate,
      gstType:      gstData.gstType,
      cgstRate:     gstData.cgstRate,
      cgstAmount:   gstData.cgstAmount,
      sgstRate:     gstData.sgstRate,
      sgstAmount:   gstData.sgstAmount,
      igstRate:     gstData.igstRate,
      igstAmount:   gstData.igstAmount,
      totalAmount:  gstData.totalAmount,
      buyerState:   gstData.buyerState,
      companyState: gstData.companyState,
    } : {};

    const invoice = await WalletInvoice.create({
      invoiceNumber,
      seller_id: transaction.seller_id,
      transaction_id: transaction._id,
      amount: transaction.amount,
      gatewayTransactionId,
      paymentMode,
      paymentGateway: transaction.source === "ccavenue" ? "ccavenue" : "payu",
      description: transaction.description || "Wallet Top-up",
      buyerName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Seller",
      buyerEmail: user.email || "",
      buyerPhone: rawPhone,
      ...gstFields,
    });

    // Back-link the invoice on the transaction so it can be resolved directly
    transaction.invoice_id = invoice._id;

    console.log(`[walletInvoiceService] ✅ Invoice created: ${invoiceNumber}`);
    return invoice;
  } catch (err) {
    console.error("[walletInvoiceService] ❌ Failed to create invoice:", err);
    return null;
  }
}
