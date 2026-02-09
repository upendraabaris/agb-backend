// src/graphql/resolvers/BlogResolver.js
import { processFile } from "../../services/fileUploadService.js";
import authenticate from "../../middlewares/auth.js";

export const Query = {
  getBlog: async (_, { id }, { models }) => {
    try {
      return await models.Blog.findById(id);
    } catch (error) {
      throw new Error(error);
    }
  },
  getAllBlog: async (
    _,
    { search, limit, offset, sortBy, sortOrder },
    { models }
  ) => {
    try {
      const query = {};

      if (search) {
        // Use a case-insensitive regular expression to search for users
        const searchRegex = new RegExp(search, "i");
        query.$or = [
          { title: searchRegex },
          { content: searchRegex },
          { tags: searchRegex },
        ];
      }

      const sortOptions = {};

      // Check if a sort field is provided
      if (sortBy) {
        // Use a case-insensitive regular expression for sorting
        // const sortField = sortBy;
        sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
      }

      const collationOptions = {
        locale: "en",
        strength: 2,
      };

      return await models.Blog.find(query)
        .collation(collationOptions)
        .sort(sortOptions)
        .limit(limit)
        .skip(offset);
    } catch (error) {
      throw new Error(error);
    }
  },
};

export const Mutation = {
  createBlog: authenticate(["admin"])(
    async (_, { title, files, content, tags }, { models }) => {
      try {
        const results = await Promise.all(files.map(processFile));
        const responseData = results.map((result) => ({
          image: result.uniqueFilename,
        }));

        const filepath = responseData.map(
          (data) => process.env.BASE_URL + data.image
        );

        const newBlog = new models.Blog({
          title,
          image: filepath,
          content,
          tags,
        });
        return await newBlog.save();
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateBlog: authenticate(["admin"])(
    async (_, { id, title, files, content, tags }, { models }) => {
      try {
        let imagesFilePath;

        if (files && files.length > 0) {
          const results = await Promise.all(files.map(processFile));
          const responseData = results.map((result) => ({
            image: result.uniqueFilename,
          }));

          imagesFilePath = responseData.map(
            (data) => process.env.BASE_URL + data.image
          );
        }

        const updatedBlog = await models.Blog.findByIdAndUpdate(
          id,
          { title, image: imagesFilePath, content, tags },
          { new: true }
        );
        return updatedBlog;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  deleteBlog: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      const deletedBlog = await models.Blog.findByIdAndRemove(id);
      return deletedBlog;
    } catch (error) {
      throw new Error(error);
    }
  }),
};

export const Blog = {};
