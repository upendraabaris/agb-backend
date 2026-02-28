// src/services/fileUploadService.js
import path from "path";
import fs from "fs";

const generateUniqueFilename = (originalFilename) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 90000) + 10000;
  const fileExtension = path.extname(originalFilename);
  return `${random}-${timestamp}${fileExtension}`;
};

export const processFile = async (file) => {
  const { createReadStream, filename, mimetype, encoding } = await file;
  const uploadsPath = path.join(process.cwd(), "uploads");
  const uniqueFilename = generateUniqueFilename(filename);
  const filePath = path.join(uploadsPath, uniqueFilename);

   // Check if the "uploads" folder exists, and create it if not
   if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  // Check if the file path is valid
  if (typeof filePath !== "string") {
    throw new Error("Invalid file path");
  }

  // Create a write stream and save the file
  const stream = await createReadStream();
  const writeStream = fs.createWriteStream(filePath);
  await new Promise((resolve, reject) => {
    stream.pipe(writeStream).on("finish", resolve).on("error", reject);
  });

  const baseUrl = process.env.BASE_URL || "";
  return {
    uniqueFilename,
    filePath: path.join(baseUrl, uniqueFilename),
    mimetype,
    encoding,
  };

  // return { uniqueFilename, uploadsPath,filePath,mimetype,encoding, createReadStream, };
};

// Process file with custom folder support
export const processFileWithFolder = async (file, folder = '') => {
  const { createReadStream, filename, mimetype, encoding } = await file;
  
  // Build path with optional subfolder
  let uploadsPath = path.join(process.cwd(), "uploads");
  if (folder) {
    uploadsPath = path.join(uploadsPath, folder);
  }
  
  const uniqueFilename = generateUniqueFilename(filename);
  const filePath = path.join(uploadsPath, uniqueFilename);

  // Check if the folder exists, and create it if not
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  
  // Check if the file path is valid
  if (typeof filePath !== "string") {
    throw new Error("Invalid file path");
  }

  // Create a write stream and save the file
  const stream = await createReadStream();
  const writeStream = fs.createWriteStream(filePath);
  await new Promise((resolve, reject) => {
    stream.pipe(writeStream).on("finish", resolve).on("error", reject);
  });

  // Build the URL path
  const relativePath = folder 
    ? `uploads/${folder}/${uniqueFilename}` 
    : `uploads/${uniqueFilename}`;

  return {
    uniqueFilename,
    filePath: relativePath,
    mimetype,
    encoding,
  };
};
