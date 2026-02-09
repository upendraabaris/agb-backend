// src/graphql/resolvers/SiteContentResolver.js
import authenticate from "../../middlewares/auth.js";
import { processFile } from "../../services/fileUploadService.js";
import jwt from "jsonwebtoken";

export const Query = {
  getHomePageSlider: async (_, { key }, { models }) => {
    try {
      const content = await models.HomePageSlider.findOne({ key });
      if (content != null) {
        return content;
      }
      return "null";
    } catch (err) {
      throw new Error("Failed to retrieve content.");
    }
  },
};

export const Mutation = {
  updateHomePageSlider: authenticate(["admin"])(
    async (_, { key, sliderimages, content, url }, { models }) => {
      try {
        if (sliderimages) {
          let updatedContent = await models.HomePageSlider.findOne({
            key: key,
          });

          let imagesFilePath;

          if (sliderimages && sliderimages.length > 0) {
            const results = await Promise.all(sliderimages.map(processFile));
            const responseData = results.map((result) => ({
              image: result.uniqueFilename,
            }));

            imagesFilePath = responseData.map(
              (data) => process.env.BASE_URL + data.image
            );
          }

          if (!updatedContent) {
            updatedContent = new models.HomePageSlider({
              key,
              images: imagesFilePath,
              content,
              url,
            });
          } else {
            updatedContent.images = imagesFilePath;
            updatedContent.content = content;
            updatedContent.url = url;
          }

          const savedContent = await updatedContent.save();
          return savedContent;
        } else {
          let updatedContent = await models.HomePageSlider.findOne({
            key: key,
          });

          let imagesFilePath = updatedContent.images;
          if (!updatedContent) {
            updatedContent = new models.HomePageSlider({
              key,
              images: imagesFilePath,
              content,
              url,
            });
          } else {
            updatedContent.images = imagesFilePath;
            updatedContent.content = content;
            updatedContent.url = url;
          }

          const savedContent = await updatedContent.save();
          return savedContent;
        }
      } catch (err) {
        throw new Error("Failed to update content.");
      }
    }
  ),
};
