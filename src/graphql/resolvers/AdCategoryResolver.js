import authenticate from "../../middlewares/auth.js";

export const Query = {
  // Get all ad categories
  adCategories: async (_, __, { models }) => {
    try {
      return await models.AdCategory.find({ is_active: true }).populate("categoryMasterId").sort({ priority: 1 });
    } catch (error) {
      throw new Error(`Failed to fetch ad categories: ${error.message}`);
    }
  },

  // Get all ad categories including inactive ones (admin only)
  allAdCategories: authenticate(["admin"])(async (_, __, { models }) => {
    try {
      return await models.AdCategory.find().populate("categoryMasterId").sort({ priority: 1 });
    } catch (error) {
      throw new Error(`Failed to fetch all ad categories: ${error.message}`);
    }
  }),

  // Get a specific ad category by ID
  getAdCategory: async (_, { id }, { models }) => {
    try {
      const category = await models.AdCategory.findById(id).populate("categoryMasterId");
      if (!category) {
        throw new Error("Ad category not found");
      }
      return category;
    } catch (error) {
      throw new Error(`Failed to fetch ad category: ${error.message}`);
    }
  },

  // Get ad category by category master ID
  getAdCategoryByMasterId: async (_, { categoryMasterId }, { models }) => {
    try {
      const categories = await models.AdCategory.find({ categoryMasterId }).populate("categoryMasterId");
      return categories;
    } catch (error) {
      throw new Error(`Failed to fetch ad categories by master id: ${error.message}`);
    }
  }
};

export const Mutation = {
  // Create a new ad category
  createAdCategory: authenticate(["admin"])(
    async (_, { input }, { models }) => {
      try {
        const existingCategory = await models.AdCategory.findOne({ categoryMasterId: input.categoryMasterId, ad_type: input.ad_type });

        if (existingCategory) {
          throw new Error("Ad category with this category master and ad_type already exists");
        }

        const category = new models.AdCategory(input);
        return await category.save().then((saved) => saved.populate("categoryMasterId"));
      } catch (error) {
        throw new Error(`Failed to create ad category: ${error.message}`);
      }
    }
  ),

  // Update an ad category
  updateAdCategory: authenticate(["admin"])(
    async (_, { id, input }, { models }) => {
      try {
        const category = await models.AdCategory.findById(id);
        if (!category) {
          throw new Error("Ad category not found");
        }

        const updatedCategory = await models.AdCategory.findByIdAndUpdate(
          id,
          { $set: input },
          { new: true, runValidators: true }
        ).populate("categoryMasterId");
        return updatedCategory;
      } catch (error) {
        throw new Error(`Failed to update ad category: ${error.message}`);
      }
    }
  ),

  // Delete an ad category
  deleteAdCategory: authenticate(["admin"])(
    async (_, { id }, { models }) => {
      try {
        const category = await models.AdCategory.findByIdAndDelete(id);
        if (!category) {
          throw new Error("Ad category not found");
        }
        return {
          success: true,
          message: "Ad category deleted successfully"
        };
      } catch (error) {
        throw new Error(`Failed to delete ad category: ${error.message}`);
      }
    }
  ),

  // Toggle ad category active status
  toggleAdCategoryStatus: authenticate(["admin"])(
    async (_, { id }, { models }) => {
      try {
        const category = await models.AdCategory.findById(id);
        if (!category) {
          throw new Error("Ad category not found");
        }

        category.is_active = !category.is_active;
        return await category.save();
      } catch (error) {
        throw new Error(`Failed to toggle ad category status: ${error.message}`);
      }
    }
  )
};
