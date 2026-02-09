import authenticate from "../../middlewares/auth.js";

export const Query = {
  // Get all active category masters
  adCategoryMasters: async (_, __, { models }) => {
    try {
      return await models.AdCategoryMaster.find({ is_active: true }).sort({ name: 1 });
    } catch (error) {
      throw new Error(`Failed to fetch category masters: ${error.message}`);
    }
  },

  // Get all category masters including inactive ones (admin only)
  allAdCategoryMasters: authenticate(["admin"])(async (_, __, { models }) => {
    try {
      return await models.AdCategoryMaster.find().sort({ name: 1 });
    } catch (error) {
      throw new Error(`Failed to fetch all category masters: ${error.message}`);
    }
  }),

  // Get a specific category master by ID
  getAdCategoryMaster: async (_, { id }, { models }) => {
    try {
      const categoryMaster = await models.AdCategoryMaster.findById(id);
      if (!categoryMaster) {
        throw new Error("Category Master not found");
      }
      return categoryMaster;
    } catch (error) {
      throw new Error(`Failed to fetch category master: ${error.message}`);
    }
  },

  // Get category master by name
  getAdCategoryMasterByName: async (_, { name }, { models }) => {
    try {
      const categoryMaster = await models.AdCategoryMaster.findOne({ name });
      if (!categoryMaster) {
        throw new Error("Category Master not found");
      }
      return categoryMaster;
    } catch (error) {
      throw new Error(`Failed to fetch category master: ${error.message}`);
    }
  }
};

export const Mutation = {
  // Create a new category master
  createAdCategoryMaster: authenticate(["admin"])(
    async (_, { input }, { models }) => {
      try {
        const existingCategoryMaster = await models.AdCategoryMaster.findOne({
          name: input.name
        });

        if (existingCategoryMaster) {
          throw new Error("Category Master with this name already exists");
        }

        const categoryMaster = new models.AdCategoryMaster(input);
        return await categoryMaster.save();
      } catch (error) {
        throw new Error(`Failed to create category master: ${error.message}`);
      }
    }
  ),

  // Update a category master
  updateAdCategoryMaster: authenticate(["admin"])(
    async (_, { id, input }, { models }) => {
      try {
        const categoryMaster = await models.AdCategoryMaster.findById(id);
        if (!categoryMaster) {
          throw new Error("Category Master not found");
        }

        // Check if new name already exists (if name is being changed)
        if (input.name && input.name !== categoryMaster.name) {
          const existingCategoryMaster = await models.AdCategoryMaster.findOne({
            name: input.name
          });
          if (existingCategoryMaster) {
            throw new Error("Category Master with this name already exists");
          }
        }

        const updatedCategoryMaster = await models.AdCategoryMaster.findByIdAndUpdate(
          id,
          { $set: input },
          { new: true, runValidators: true }
        );
        return updatedCategoryMaster;
      } catch (error) {
        throw new Error(`Failed to update category master: ${error.message}`);
      }
    }
  ),

  // Delete a category master
  deleteAdCategoryMaster: authenticate(["admin"])(
    async (_, { id }, { models }) => {
      try {
        const categoryMaster = await models.AdCategoryMaster.findByIdAndDelete(id);
        if (!categoryMaster) {
          throw new Error("Category Master not found");
        }
        return {
          success: true,
          message: "Category Master deleted successfully"
        };
      } catch (error) {
        throw new Error(`Failed to delete category master: ${error.message}`);
      }
    }
  ),

  // Toggle category master active status
  toggleAdCategoryMasterStatus: authenticate(["admin"])(
    async (_, { id }, { models }) => {
      try {
        const categoryMaster = await models.AdCategoryMaster.findById(id);
        if (!categoryMaster) {
          throw new Error("Category Master not found");
        }

        categoryMaster.is_active = !categoryMaster.is_active;
        return await categoryMaster.save();
      } catch (error) {
        throw new Error(`Failed to toggle category master status: ${error.message}`);
      }
    }
  )
};
