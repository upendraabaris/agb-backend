import authenticate from "../../middlewares/auth.js";
import jwt from "jsonwebtoken";
import { processFile } from "../../services/fileUploadService.js";

export const Query = {
  myAds: authenticate(["seller"])(async (_, __, { models, req }) => {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentSeller = await models.Seller.findOne({ user: decoded._id });
      if (!currentSeller) throw new Error("Seller not found");
      return await models.AdsMaster.find({ sellerId: currentSeller._id });
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  getAllAds: authenticate(["admin"]) (async (_, __, { models }) => {
    try {
      return await models.AdsMaster.find().sort({ createdAt: -1 });
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  getAdById: authenticate(["admin", "seller"]) (async (_, { id }, { models }) => {
    try {
      return await models.AdsMaster.findById(id);
    } catch (err) {
      throw new Error(err.message);
    }
  })
};

export const Mutation = {
  createAdsMaster: authenticate(["seller"]) (async (_, { input }, { models, req }) => {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentSeller = await models.Seller.findOne({ user: decoded._1 || decoded._id });
      // fallback to decoded._id
      const sellerId = currentSeller ? currentSeller._id : decoded._id;

      // Process image uploads if they are file objects
      let mobileImageUrl = input.mobile_image_url;
      let desktopImageUrl = input.desktop_image_url;

      if (input.mobile_image_url && typeof input.mobile_image_url === 'object' && input.mobile_image_url.createReadStream) {
        const mobileResult = await processFile(input.mobile_image_url);
        mobileImageUrl = process.env.BASE_URL + mobileResult.uniqueFilename;
      }

      if (input.desktop_image_url && typeof input.desktop_image_url === 'object' && input.desktop_image_url.createReadStream) {
        const desktopResult = await processFile(input.desktop_image_url);
        desktopImageUrl = process.env.BASE_URL + desktopResult.uniqueFilename;
      }

      const ad = new models.AdsMaster({
        sellerId,
        ad_category_id: input.ad_category_id,
        slot_id: input.slot_id,
        mobile_image_url: mobileImageUrl,
        mobile_redirect_url: input.mobile_redirect_url,
        desktop_image_url: desktopImageUrl,
        desktop_redirect_url: input.desktop_redirect_url,
      });

      return await ad.save();
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  updateAdsMaster: authenticate(["seller"]) (async (_, { id, input }, { models, req }) => {
    try {
      const ad = await models.AdsMaster.findById(id);
      if (!ad) throw new Error("Ad not found");

      ad.ad_category_id = input.ad_category_id || ad.ad_category_id;
      ad.slot_id = input.slot_id || ad.slot_id;
      ad.mobile_image_url = input.mobile_image_url || ad.mobile_image_url;
      ad.mobile_redirect_url = input.mobile_redirect_url || ad.mobile_redirect_url;
      ad.desktop_image_url = input.desktop_image_url || ad.desktop_image_url;
      ad.desktop_redirect_url = input.desktop_redirect_url || ad.desktop_redirect_url;

      return await ad.save();
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  deleteAdsMaster: authenticate(["seller"]) (async (_, { id }, { models }) => {
    try {
      const ad = await models.AdsMaster.findByIdAndDelete(id);
      if (!ad) throw new Error("Ad not found");
      return { success: true, message: "Ad deleted" };
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  approveAd: authenticate(["admin"]) (async (_, { id, start_date, end_date, slot_id }, { models }) => {
    try {
      const ad = await models.AdsMaster.findById(id);
      if (!ad) throw new Error("Ad not found");
      if (ad.status === "approved") throw new Error("Ad already approved");

      // create campaign
      const campaign = new models.AdCampaign({
        ad_id: ad._id,
        slot_id: slot_id || ad.slot_id,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
      });
      await campaign.save();

      ad.status = "approved";
      await ad.save();

      return ad;
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  rejectAd: authenticate(["admin"]) (async (_, { id, reason }, { models }) => {
    try {
      const ad = await models.AdsMaster.findById(id);
      if (!ad) throw new Error("Ad not found");
      ad.status = "rejected";
      await ad.save();
      return ad;
    } catch (err) {
      throw new Error(err.message);
    }
  })
};
