// src/graphql/resolvers/AdsResolver.js
import authenticate from "../../middlewares/auth.js";
import { processFile } from "../../services/fileUploadService.js";
import jwt from "jsonwebtoken";

export const Query = {
  getAds: async (_, { key }, { models }) => {
    try {
      const content = await models.Ads.findOne({ key });
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
  updateAds: authenticate(["admin"])(
    async (_, { key, adimage, url, active }, { models }) => {
      try {
        let updatedContent = await models.Ads.findOne({ key: key });        
        let filepath;
        if (adimage) {
          const result = await processFile(adimage);
          const responseData = {
            filename: result.uniqueFilename,
          };
          filepath = process.env.BASE_URL + responseData.filename;
        }else{
          filepath = updatedContent.images;
        }
        if(!url){
          url = updatedContent.url;
        }

        if (!updatedContent) {
          updatedContent = new models.Ads({
            key,
            images: filepath,
            url,
            active,
          });
        } else {
          updatedContent.images = filepath;
          updatedContent.url = url;
          updatedContent.active = active;
        }
        const savedContent = await updatedContent.save();
        return savedContent;
      } catch (err) {
        throw new Error(err);
      }
    }
  ),
};
