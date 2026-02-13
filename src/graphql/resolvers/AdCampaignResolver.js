import authenticate from "../../middlewares/auth.js";

export const Query = {
  adCampaigns: authenticate(["admin"]) (async (_, __, { models }) => {
    try {
      return await models.AdCampaign.find().sort({ createdAt: -1 });
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  getAdCampaign: authenticate(["admin"]) (async (_, { id }, { models }) => {
    try {
      return await models.AdCampaign.findById(id);
    } catch (err) {
      throw new Error(err.message);
    }
  })
};

export const Mutation = {
  createAdCampaign: authenticate(["admin"]) (async (_, { input }, { models }) => {
    try {
      const campaign = new models.AdCampaign({
        ad_id: input.ad_id,
        slot_id: input.slot_id,
        start_date: new Date(input.start_date),
        end_date: new Date(input.end_date),
      });
      return await campaign.save();
    } catch (err) {
      throw new Error(err.message);
    }
  })
};
