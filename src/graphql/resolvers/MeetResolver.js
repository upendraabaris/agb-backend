// src/graphql/resolvers/SiteContentResolver.js
import authenticate from "../../middlewares/auth.js";
import { processFile } from "../../services/fileUploadService.js";


export const Query = {
  getMeet: async (_, __, { models }) => {
    try {
      const meet = await models.Meet.find();
      if (meet != null) {
        return meet;
      }
      return "null";
    } catch (err) {
      throw new Error("Failed to retrieve content.");
    }
  },
};

export const Mutation = {
  createMeet: authenticate(["admin"])(async (_, args, { models }) => {
    try {
        const result = await processFile(args.file);
        const responseData = {
          filename: result.uniqueFilename,
        };
        const filepath = process.env.BASE_URL + responseData.filename;
        const updatedMeet = new models.Meet({ 
            title:args.title,
            image:filepath,
            role:args.role, 
        });
        await updatedMeet.save();
        return updatedMeet;
    } catch (error) {
      throw new Error("Failed to update content.");
    }
  }),

  updateMeet: authenticate(["admin"])(async (_, args, { models }) => {
    try {
      const updatedMeet = await models.Meet.findById(args.id);

      if (args.title) {
        updatedMeet.title = args.title;
      }
      if (args.file) {
        const result = await processFile(args.file);
        const responseData = {
          filename: result.uniqueFilename,
        };
        updatedMeet.image = process.env.BASE_URL + responseData.filename;
      }
      if (args.role) {
        updatedMeet.role = args.role;
      }

      await updatedMeet.save();
      return updatedMeet;
    } catch (err) {
      throw new Error("Failed to update content.");
    }
  }),
};
