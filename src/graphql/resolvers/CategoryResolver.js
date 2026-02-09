// src/graphql/resolvers/CategoryResolver.js
import { processFile } from "../../services/fileUploadService.js";
import authenticate from "../../middlewares/auth.js";
import { deleteFile } from "../../services/fileUtils.js";

export const Query = {
  getCategory: async (_, { id }, { models }) => {
    try {
      return await models.Category.findById(id);
    } catch (error) {
      throw new Error(error);
    }
  },
  getCategoryByName: async (_, { name }, { models }) => {
    try {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`^${escapedName}$`, "i");
      const byname = await models.Category.findOne({ name: regex });
      return byname;
    } catch (error) {
      throw new Error(error);
    }
  },
  getAllCategories: async (
    _,
    { search, limit, offset, sortBy, sortOrder },
    { models }
  ) => {
    try {
      const query = {};

      if (search) {
        // Use a case-insensitive regular expression to search for users
        const searchRegex = new RegExp(search, "i");
        query.$or = [{ name: searchRegex }];
      }

      const sortOptions = {};

      // Check if a sort field is provided
      if (sortBy) {
        // Use a case-insensitive regular expression for sorting
        sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
      }

      const collationOptions = {
        locale: "en",
        strength: 2,
      };
      return await models.Category.find(query)
        .collation(collationOptions)
        .sort(sortOptions)
        .limit(limit)
        .skip(offset);
    } catch (error) {
      throw new Error(error);
    }
  },
};

const deleteChildren = async (categoryId, _, { models }) => {
  const children = await models.Category.find({ parent: categoryId });

  for (const child of children) {
    await deleteChildren(child.id);
    await models.Category.findByIdAndRemove(child.id);
  }
};

export const Mutation = {
  createCategory: authenticate(["admin"])(
    async (_, { name, file, description, parent, order }, { models }) => {
      try {
        const result = await processFile(file);
        const responseData = {
          filename: result.uniqueFilename,
        };
        const filepath = process.env.BASE_URL + responseData.filename;

        const newCategory = new models.Category({
          name,
          description,
          parent,
          order,
          image: filepath,
        });
        return await newCategory.save();
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateCategory: authenticate(["admin"])(
    async (
      _,
      { id, name, file, description, parent, image, order },
      { models }
    ) => {
      try {
        let filepath;
        if (file) {
          const result = await processFile(file);
          const responseData = {
            filename: result.uniqueFilename,
          };
          filepath = process.env.BASE_URL + responseData.filename;
        }
        const updateFields = {
          name,
          description,
          parent,
          image,
          order,
        };
        if (filepath) {
          updateFields.image = filepath;
          await deleteFile(image);
        }
        const updatedCategory = await models.Category.findByIdAndUpdate(
          id,
          updateFields,
          { new: true }
        );
        return updatedCategory;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  deleteCategory: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      // await deleteChildren(id);
      const deletedCategory = await models.Category.findByIdAndRemove(id);
      return deletedCategory;
    } catch (error) {
      throw new Error(error);
    }
  }),
  updateCategory1: authenticate(["admin"])(
    async (_, { id, file, sliderImage }, { models }) => {
      try {
        let filepath;
        if (file) {
          const result = await processFile(file);
          const responseData = {
            filename: result.uniqueFilename,
          };
          filepath = process.env.BASE_URL + responseData.filename;
        }
  
        const category = await models.Category.findById(id);
        if (!category) {
          throw new Error("Category not found");
        }
  
        if (sliderImage && category.sliderImage) {
          await deleteFile(category.sliderImage);
        }
  
        const updateFields = {
          sliderImage: filepath || category.sliderImage,
        };
        const updatedCategory = await models.Category.findByIdAndUpdate(
          id,
          updateFields,
          { new: true }
        );
  
        return updatedCategory;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
};

export const Category = {
  parent: async (category, _, { models }) => {
    return await models.Category.findById(category.parent);
  },
  children: async (category, args, { models }) => {
    return await models.Category.find({ parent: category.id });
  },
};
