import fs from "fs";
import path from "path";

export const deleteFile = (url) => {
  return new Promise((resolve, reject) => {
    // Extract the filename from the URL
    const filename = url.substring(url.lastIndexOf("/") + 1);

    const uploadsPath = path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadsPath, filename);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return reject(new Error("File not found."));
    }

    // Delete the file
    fs.unlink(filePath, (error) => {
      if (error) {
        return reject(error);
      }
      resolve();
    });
  });
};
