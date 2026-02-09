import authenticate from "../../middlewares/auth.js";

export const Query = {
  // Get all active slots
  slots: async (_, __, { models }) => {
    try {
      return await models.Slot.find({ is_active: true }).sort({ slot_number: 1 });
    } catch (error) {
      throw new Error(`Failed to fetch slots: ${error.message}`);
    }
  },

  // Get all slots including inactive ones (admin only)
  allSlots: authenticate(["admin"])(async (_, __, { models }) => {
    try {
      return await models.Slot.find().sort({ slot_number: 1 });
    } catch (error) {
      throw new Error(`Failed to fetch all slots: ${error.message}`);
    }
  }),

  // Get a specific slot by ID
  getSlot: async (_, { id }, { models }) => {
    try {
      const slot = await models.Slot.findById(id);
      if (!slot) {
        throw new Error("Slot not found");
      }
      return slot;
    } catch (error) {
      throw new Error(`Failed to fetch slot: ${error.message}`);
    }
  },

  // Get slots by ad_type
  getSlotByAdType: async (_, { ad_type }, { models }) => {
    try {
      const slots = await models.Slot.find({ ad_type, is_active: true }).sort({ slot_number: 1 });
      return slots;
    } catch (error) {
      throw new Error(`Failed to fetch slots by ad_type: ${error.message}`);
    }
  }
};

export const Mutation = {
  // Create a new slot
  createSlot: authenticate(["admin"])(
    async (_, args, { models }) => {
      try {
        const { ad_slot, ad_type, position, slot_number } = args;

        const existingSlot = await models.Slot.findOne({
          ad_slot,
          slot_number
        });

        if (existingSlot) {
          throw new Error("Slot with this ad_slot and slot_number already exists");
        }

        const slot = new models.Slot({
          ad_slot,
          ad_type,
          position,
          slot_number
        });
        return await slot.save();
      } catch (error) {
        throw new Error(`Failed to create slot: ${error.message}`);
      }
    }
  ),

  // Update a slot
  updateSlot: authenticate(["admin"])(
    async (_, args, { models }) => {
      try {
        const { id, ad_slot, ad_type, position, slot_number } = args;
        
        const slot = await models.Slot.findById(id);
        if (!slot) {
          throw new Error("Slot not found");
        }

        const updateData = {};
        if (ad_slot !== undefined) updateData.ad_slot = ad_slot;
        if (ad_type !== undefined) updateData.ad_type = ad_type;
        if (position !== undefined) updateData.position = position;
        if (slot_number !== undefined) updateData.slot_number = slot_number;

        const updatedSlot = await models.Slot.findByIdAndUpdate(
          id,
          { $set: updateData },
          { new: true, runValidators: true }
        );
        return updatedSlot;
      } catch (error) {
        throw new Error(`Failed to update slot: ${error.message}`);
      }
    }
  ),

  // Delete a slot
  deleteSlot: authenticate(["admin"])(
    async (_, { id }, { models }) => {
      try {
        const slot = await models.Slot.findByIdAndDelete(id);
        if (!slot) {
          throw new Error("Slot not found");
        }
        return {
          success: true,
          message: "Slot deleted successfully"
        };
      } catch (error) {
        throw new Error(`Failed to delete slot: ${error.message}`);
      }
    }
  ),

  // Toggle slot active status
  toggleSlotStatus: authenticate(["admin"])(
    async (_, { id }, { models }) => {
      try {
        const slot = await models.Slot.findById(id);
        if (!slot) {
          throw new Error("Slot not found");
        }

        slot.is_active = !slot.is_active;
        return await slot.save();
      } catch (error) {
        throw new Error(`Failed to toggle slot status: ${error.message}`);
      }
    }
  )
};
