import authenticate from "../../middlewares/auth.js";

export const Query = {
  adTierMasters: async (_, __, { models }) => {
    try {
      return await models.AdTierMaster.find({ is_active: true }).sort({ name: 1 });
    } catch (error) {
      throw new Error(`Failed to fetch tier masters: ${error.message}`);
    }
  },

  allAdTierMasters: authenticate(["admin"]) (async (_, __, { models }) => {
    try {
      return await models.AdTierMaster.find().sort({ name: 1 });
    } catch (error) {
      throw new Error(`Failed to fetch all tier masters: ${error.message}`);
    }
  }),

  getAdTierMaster: async (_, { id }, { models }) => {
    try {
      const item = await models.AdTierMaster.findById(id);
      if (!item) throw new Error("Tier Master not found");
      return item;
    } catch (error) {
      throw new Error(`Failed to fetch tier master: ${error.message}`);
    }
  },

  getAdTierMasterByName: async (_, { name }, { models }) => {
    try {
      const item = await models.AdTierMaster.findOne({ name });
      if (!item) throw new Error("Tier Master not found");
      return item;
    } catch (error) {
      throw new Error(`Failed to fetch tier master: ${error.message}`);
    }
  }
};

export const Mutation = {
  createAdTierMaster: authenticate(["admin"]) (
    async (_, { input }, { models }) => {
      try {
        const existing = await models.AdTierMaster.findOne({ name: input.name });
        if (existing) throw new Error("Tier Master with this name already exists");
        const obj = new models.AdTierMaster(input);
        return await obj.save();
      } catch (error) {
        throw new Error(`Failed to create tier master: ${error.message}`);
      }
    }
  ),

  updateAdTierMaster: authenticate(["admin"]) (
    async (_, { id, input }, { models }) => {
      try {
        const existing = await models.AdTierMaster.findById(id);
        if (!existing) throw new Error("Tier Master not found");
        if (input.name && input.name !== existing.name) {
          const duplicate = await models.AdTierMaster.findOne({ name: input.name });
          if (duplicate) throw new Error("Tier Master with this name already exists");
        }
        const updated = await models.AdTierMaster.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true });
        return updated;
      } catch (error) {
        throw new Error(`Failed to update tier master: ${error.message}`);
      }
    }
  ),

  deleteAdTierMaster: authenticate(["admin"]) (
    async (_, { id }, { models }) => {
      try {
        const deleted = await models.AdTierMaster.findByIdAndDelete(id);
        if (!deleted) throw new Error("Tier Master not found");
        return { success: true, message: "Tier Master deleted successfully" };
      } catch (error) {
        throw new Error(`Failed to delete tier master: ${error.message}`);
      }
    }
  ),

  toggleAdTierMasterStatus: authenticate(["admin"]) (
    async (_, { id }, { models }) => {
      try {
        const item = await models.AdTierMaster.findById(id);
        if (!item) throw new Error("Tier Master not found");
        item.is_active = !item.is_active;
        return await item.save();
      } catch (error) {
        throw new Error(`Failed to toggle tier master status: ${error.message}`);
      }
    }
  )
};
