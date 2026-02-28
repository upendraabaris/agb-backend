import mongoose from "mongoose";

const sellerWalletSchema = new mongoose.Schema(
    {
        seller_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Seller",
            required: true,
            unique: true,
        },
        balance: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

const SellerWallet = mongoose.model("SellerWallet", sellerWalletSchema);

export default SellerWallet;