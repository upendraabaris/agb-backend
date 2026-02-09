// src/graphql/resolvers/ProductResolver.js

import { processFile } from "../../services/fileUploadService.js";
import authenticate from "../../middlewares/auth.js";
import { deleteFile } from "../../services/fileUtils.js";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

// Configure the nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const Query = {
  homePageSearch: async (_, args, { models }) => {
    try {
      // Wrong speling handaling
      // function fuzzyRegex(word) {
      //   const pattern = word
      //     .split("")
      //     .map((char) => `${char}.*?`)
      //     .join("");

      //   return new RegExp(pattern, "i");
      // }

      // let query = {};

      const query = {};

      if (args.search) {
        const keywords = args.search.trim().split(/\s+/); // split words by space

        query.$and = keywords.map((word) => ({
          $or: [
            { fullName: new RegExp(word, "i") },
            { brand_name: new RegExp(word, "i") },
            { previewName: new RegExp(word, "i") },
            { searchName: new RegExp(word, "i") },
          ],
        }));
      }
      const productQuery = {
        $and: [{ approve: true }, { active: true }],
      };
      const seriesproductQuery = {
        $and: [{ active: true }],
      };

      const product = await models.Product.find({
        $and: [query, productQuery],
      });
      const seriesproduct = await models.SeriesProduct.find({
        $and: [query, seriesproductQuery],
      });
      const tmtproduct = await models.TMTSeriesProduct.find({
        $and: [query, productQuery],
      });
      const superproduct = await models.SuperSellerProduct.find({
        $and: [query, productQuery],
      });

      const matchedProducts = [
        ...product,
        ...seriesproduct,
        ...tmtproduct,
        ...superproduct,
      ];

      const currentPage = args.page || 1;
      const itemsPerPage = args.itemsPerPage || 20;
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedProducts = matchedProducts.slice(startIndex, endIndex);

      return paginatedProducts;

      // // Calculate the total number of pages
      // const totalPages = Math.ceil(matchedProducts.length / itemsPerPage);

      // return {
      //   items: paginatedProducts,
      //   totalPages: totalPages,
      // };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  getProductByCat: async (
    _,
    { category_name, sortBy, discountPercentage, minPrice, maxPrice },
    { models }
  ) => {
    try {
      const escapedName = category_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`^${escapedName}$`, "i");
      const catid = await models.Category.findOne({ name: regex });

      let filter = {
        $and: [{ categories: catid._id }, { approve: true }, { active: true }],
      };

      // Apply discount percentage filter
      if (discountPercentage) {
        filter["variant.location.b2cdiscount"] = { $gte: discountPercentage };
      }

      // Apply price range filter
      if (minPrice && maxPrice) {
        filter["variant.location.price"] = {
          $gte: parseFloat(minPrice),
          $lte: parseFloat(maxPrice),
        };
      }

      let getProductByCategory;

      if (sortBy === "asc") {
        getProductByCategory = await models.Product.find(filter).sort({
          previewName: 1,
        });
      } else if (sortBy === "desc") {
        getProductByCategory = await models.Product.find(filter).sort({
          previewName: -1,
        });
      } else {
        getProductByCategory = await models.Product.find(filter);
      }

      return getProductByCategory;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  getAllProductByCat: async (_, { category_name }, { models }) => {
    try {
      const escapedName = category_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`^${escapedName}$`, "i");
      const catid = await models.Category.findOne({ name: regex });
      const getProductByCategory = await models.Product.find({
        $and: [{ categories: catid._id }, { approve: true }],
      });
      const getSerirsProductByCategory = await models.SeriesProduct.find({
        categories: catid._id,
      });
      const getTMTProductByCategory = await models.TMTSeriesProduct.find({
        categories: catid._id,
      });
      const getSuperProductByCategory = await models.SuperSellerProduct.find({
        $and: [{ categories: catid._id }, { approve: true }],
      });
      const getAllProduct = [
        ...getProductByCategory,
        ...getSerirsProductByCategory,
        ...getTMTProductByCategory,
        ...getSuperProductByCategory,
      ];
      return getAllProduct;
    } catch (error) {
      throw new Error(error.message);
    }
  },
  getProductByCatId: async (_, { cat_id }, { models }) => {
    try {
      const product = await models.Product.find({
        $and: [{ categories: cat_id }, { approve: true }, { active: true }],
      });
      return product;
    } catch (error) {
      throw new Error(error.message);
    }
  },
  getProductByID: async (_, { id }, { models }) => {
    try {
      const product = await models.Product.findById(id);
      return product;
    } catch (error) {
      throw new Error("Failed to fetch product");
    }
  },
  getProductBySeller: authenticate(["admin", "seller"])(
    async (
      _,
      { seller_id, search, limit, offset, sortBy, sortOrder },
      { models }
    ) => {
      try {
        const query = {};
        if (search) {
          const searchRegex = new RegExp(search, "i");
          query.$or = [
            { fullName: searchRegex },
            { brand_name: searchRegex },
            { previewName: searchRegex },
            { searchName: searchRegex },
          ];
        }
        const sortOptions = {};
        if (sortBy) {
          sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
        }
        const collationOptions = {
          locale: "en",
          strength: 2,
        };
        const getProductBySeller = await models.Product.find({
          "variant.location.sellerId": seller_id,
          ...query,
        })
          .populate("variant.location.sellerId")
          .collation(collationOptions)
          .sort(sortOptions)
          .limit(limit)
          .skip(offset);
        return getProductBySeller;
      } catch (error) {
        throw new Error(error.message);
      }
    }
  ),
  getProductByForSeller: authenticate(["enquiry", "seller", "subBusiness"])(
    async (
      _,
      { search, limit, offset, sortBy, sortOrder },
      { models, req }
    ) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const query = {};
        if (search) {
          const searchRegex = new RegExp(search, "i");
          query.$or = [
            { fullName: searchRegex },
            { brand_name: searchRegex },
            { previewName: searchRegex },
            { searchName: searchRegex },
          ];
        }
        const sortOptions = {};
        if (sortBy) {
          sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
        }
        const collationOptions = {
          locale: "en",
          strength: 2,
        };
        const getProductBySeller = await models.Product.find({
          "variant.location.sellerId": user.seller,
          ...query,
        })
          .populate("variant.location.sellerId")
          .collation(collationOptions)
          .sort(sortOptions)
          .limit(limit)
          .skip(offset);
        return getProductBySeller;
      } catch (error) {
        throw new Error(error.message);
      }
    }
  ),
  getProductEnquiryByForSeller: authenticate(["seller", "enquiry"])(
    async (
      _,
      { search, limit, offset, sortBy, sortOrder },
      { models, req }
    ) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const query = {
          "variant.location.sellerId": user.seller,
          "variant.location.price": 0,
        };
        if (search) {
          const searchRegex = new RegExp(search, "i");
          query.$or = [
            { fullName: searchRegex },
            { brand_name: searchRegex },
            { previewName: searchRegex },
            { searchName: searchRegex },
          ];
        }
        const sortOptions = {};
        if (sortBy) {
          sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
        }
        const collationOptions = {
          locale: "en",
          strength: 2,
        };
        const getProductBySeller = await models.Product.find(query)
          .populate("variant.location.sellerId")
          .collation(collationOptions)
          .sort(sortOptions)
          .limit(limit)
          .skip(offset);
        return getProductBySeller;
      } catch (error) {
        throw new Error(error.message);
      }
    }
  ),
  getProduct: async (_, { name }, { models }) => {
    try {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`^${escapedName}$`, "i");
      const byname = await models.Product.findOne({ identifier: regex });
      return byname;
    } catch (error) {
      throw new Error("Failed to fetch product");
    }
  },
  pendingapprove: authenticate(["admin", "seller"])(
    async (_, args, { models }) => {
      try {
        const product = await models.Product.find({ approve: false });
        return product;
      } catch (error) {
        throw new Error("Failed to fetch product");
      }
    }
  ),
  approvedproduct: authenticate(["admin", "seller"])(
    async (_, args, { models }) => {
      try {
        const product = await models.Product.find({ approve: true });
        return product;
      } catch (error) {
        throw new Error("Failed to fetch product");
      }
    }
  ),
  approvedproducts: async (_, args, { models }) => {
    try {
      const product = await models.Product.find({
        $and: [{ active: true }, { approve: true }],
      });
      return product;
    } catch (error) {
      throw new Error("Failed to fetch product");
    }
  },
  getAllProduct: async (
    _,
    { search, limit, offset, sortBy, sortOrder },
    { models }
  ) => {
    try {
      const query = {};
      if (search) {
        const searchRegex = new RegExp(search, "i");
        query.$or = [
          { fullName: searchRegex },
          { brand_name: searchRegex },
          { previewName: searchRegex },
          { searchName: searchRegex },
        ];
      }
      const sortOptions = {};
      if (sortBy) {
        sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
      }
      const collationOptions = {
        locale: "en",
        strength: 2,
      };
      const byname = await models.Product.find({
        ...query,
      })
        .populate("variant.location.sellerId")
        .collation(collationOptions)
        .sort(sortOptions)
        .limit(limit)
        .skip(offset);
      return byname;
    } catch (error) {
      throw new Error("Failed to fetch product");
    }
  },
};

export const Mutation = {
  createProduct: authenticate(["admin", "seller"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const random = Math.floor(Math.random() * 90000) + 10000;
        const productidentifier = `${args.fullName}-${random}`;
        const sku = `${args.previewName}-${args.brand_name}-${random}`;
        const results = await Promise.all(args.productImages.map(processFile));
        const responseData = results.map((result) => ({
          image: result.uniqueFilename,
        }));
        const imagesfilepath = responseData.map(
          (data) => process.env.BASE_URL + data.image
        );
        const product = new models.Product({
          faq: args.faq,
          brand_name: args.brand_name,
          previewName: args.previewName,
          searchName: args.searchName,
          fullName: args.fullName,
          identifier: productidentifier,
          thumbnail: args.thumbnail,
          sku: sku,
          returnPolicy: args.returnPolicy,
          shippingPolicy: args.shippingPolicy,
          cancellationPolicy: args.cancellationPolicy,
          description: args.description,
          giftOffer: args.giftOffer,
          sellerNotes: args.sellerNotes,
          policy: args.policy,
          active: args.active,
          video: args.video,
          youtubeLink: args.youtubeLink,
          catalogue: args.catalogue,
          approve: args.approve,
          categories: args.categories,
          images: imagesfilepath,
        });
        await product.save();
        const updatedVariants = [];
        for (const data of args.variant) {
          if (
            !data.location ||
            !Array.isArray(data.location) ||
            data.location.length === 0
          ) {
            throw new Error("Invalid or missing location data for a variant.");
          }
          const updatedLocations = [];
          for (const location of data.location) {
            const updatedloc = { ...location, sellerId: user.seller };
            updatedLocations.push(updatedloc);
          }
          data.location = updatedLocations;
          updatedVariants.push(data);
        }
        product.variant.push(...updatedVariants);
        await product.save();
        return product;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  importProductsFromExcel: authenticate(["admin", "seller"])(
    async (_, { file }, { models, req }) => {
      const { createReadStream } = await file;
      const stream = createReadStream();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.read(stream);

      const sheet = workbook.worksheets[0]; // पहली शीट
      const headerRow = sheet.getRow(1);
      const headers = headerRow.values.slice(1); // assume first row headers

      const failedRows = [];
      let successCount = 0;

      // टोकन से sellerId निकालें
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await models.User.findById(decoded._id);
      const sellerId = user.seller;

      // हर डाटा रो के लिए लूप
      sheet.eachRow({ includeEmpty: false }, async (row, rowNumber) => {
        if (rowNumber === 1) return; // header छोड़ें
        try {
          const rowData = {};
          row.values.slice(1).forEach((cell, idx) => {
            rowData[headers[idx]] = cell;
          });

          // उदाहरण के लिए Excel में ये कॉलम होने चाहिए:
          // fullName, previewName, searchName, brand_name, description, categories (comma-separated), active, ...
          // और variants, faq, locations JSON स्ट्रिंग के रूप में
          const args = {
            fullName: rowData.fullName,
            previewName: rowData.previewName,
            searchName: rowData.searchName,
            brand_name: rowData.brand_name,
            description: rowData.description,
            categories: rowData.categories
              ? rowData.categories.split(",").map((c) => c.trim())
              : [],
            active: rowData.active === "true",
            // यदि Excel में आपकी कॉलम JSON स्टाइल में हैं:
            variant: rowData.variant ? JSON.parse(rowData.variant) : [],
            faq: rowData.faq ? JSON.parse(rowData.faq) : [],
            // अन्य फील्ड्स...
          };

          // चित्र अपलोड या URLs:
          // args.productImages = []; // या Excel में URLs से
          // args.thumbnail = rowData.thumbnailUrl;

          // SKU, identifier आदि जनरेट
          const random = Math.floor(Math.random() * 90000) + 10000;
          args.sku = `${args.previewName}-${args.brand_name}-${random}`;
          args.identifier = `${args.fullName}-${random}`;

          // नया प्रोडक्ट बनाएँ
          const product = new models.Product({
            faq: args.faq,
            brand_name: args.brand_name,
            previewName: args.previewName,
            searchName: args.searchName,
            fullName: args.fullName,
            identifier: args.identifier,
            thumbnail: args.thumbnail,
            sku: args.sku,
            description: args.description,
            active: args.active,
            categories: args.categories,
            // images, video, policies इत्यादि
          });

          // variants में sellerId जोड़ें
          const updatedVariants = args.variant.map((v) => {
            const locs = (v.location || []).map((loc) => ({
              ...loc,
              sellerId,
            }));
            return { ...v, location: locs };
          });
          product.variant.push(...updatedVariants);

          await product.save();
          successCount++;
        } catch (err) {
          failedRows.push({
            rowNumber,
            error: err.message,
          });
        }
      });

      return {
        successCount,
        failedRows,
      };
    }
  ),
  addcommandapprove: authenticate(["admin"])(async (_, args, { models }) => {
    try {
      const product = await models.Product.findById(args.id);
      if (!product) {
        console.log("product not found");
      }
      const productClass = await models.ProductClass.findById(
        args.productClassNameID
      );
      product.classCode = productClass.code;
      product.listingCommType = args.listingCommType;
      product.listingComm = args.listingComm;
      product.productCommType = args.productCommType;
      product.productComm = args.productComm;
      product.shippingCommType = args.shippingCommType;
      product.shippingComm = args.shippingComm;
      product.fixedCommType = args.fixedCommType;
      product.fixedComm = args.fixedComm;
      product.approve = args.approve;
      product.reject = args.reject;
      product.rejectReason = args.rejectReason;
      await product.save();
      if (product.approve) {
        // Send Email
        try {
          const sellerID = product.variant[0].location[0].sellerId;
          const productidentifierupdate = product.identifier.replace(/ /g, "_");
          const olink = `${process.env.FRONT_URL}/product/${productidentifierupdate}`;
          const seller = await models.Seller.findById(sellerID);
          const master = await models.StoreFeature.findOne({});
          const adminemail = await models.SiteContent.findOne({
            key: "adminEnquiryEmail",
          });
          const emaildata = await models.SiteContent.findOne({
            key: "ProductApproval",
          });
          const emaildatasubject = await models.SiteContent.findOne({
            key: "ProductApprovalsubject",
          });
          const inputString = emaildata.content;
          const inputStringsubject = emaildatasubject.content;
          const params = {
            $productlink: olink,
            $productname: product.fullName,
            $seller: seller.companyName,
            $website: master.storeName,
          };
          const subject = inputStringsubject;
          const modifiedsubject = subject.replace(
            /\$\w+/g,
            (match) => params[match] || match
          );
          const modifiedString = inputString.replace(
            /\$\w+/g,
            (match) => params[match] || match
          );
          const mailOptions = {
            from: process.env.SMTP_USER,
            to: seller.email,
            cc: [adminemail.content],
            subject: modifiedsubject,
            html: modifiedString.replace(/<br>/g, ""),
          };
          await transporter.sendMail(mailOptions);
        } catch (error) {
          console.log(error);
        }
        // End Email
      } else {
        // Send Email
        const sellerID = product.variant[0].location[0].sellerId;
        const productidentifierupdate = product.identifier.replace(/ /g, "_");
        const olink = `${process.env.FRONT_URL}/product/${productidentifierupdate}`;
        const seller = await models.Seller.findById(sellerID);
        const master = await models.StoreFeature.findOne({});
        const adminemail = await models.SiteContent.findOne({
          key: "adminEnquiryEmail",
        });
        const emaildata = await models.SiteContent.findOne({
          key: "ProductReject",
        });
        const emaildatasubject = await models.SiteContent.findOne({
          key: "ProductRejectsubject",
        });
        const inputString = emaildata.content;
        const inputStringsubject = emaildatasubject.content;
        const params = {
          $productlink: olink,
          $productname: product.fullName,
          $seller: seller.companyName,
          $reason: args.rejectReason,
          $website: master.storeName,
        };
        const subject = inputStringsubject;
        const modifiedsubject = subject.replace(
          /\$\w+/g,
          (match) => params[match] || match
        );
        const modifiedString = inputString.replace(
          /\$\w+/g,
          (match) => params[match] || match
        );
        const mailOptions = {
          from: process.env.SMTP_USER,
          to: seller.email,
          cc: [adminemail.content],
          subject: modifiedsubject,
          html: modifiedString.replace(/<br>/g, ""),
        };
        await transporter.sendMail(mailOptions);
        // End Email
      }
      return product;
    } catch (error) {
      throw new Error(error);
    }
  }),
  uploadThumbnail: authenticate(["admin", "seller"])(
    async (_, args, { models }) => {
      try {
        const product = await models.Product.findById(args.id);
        let filepath;
        if (args.file) {
          const result = await processFile(args.file);
          const responseData = {
            filename: result.uniqueFilename,
          };
          filepath = process.env.BASE_URL + responseData.filename;
        }

        if (filepath) {
          product.thumbnail = filepath;
          if (args.filestring) {
            await deleteFile(args.filestring);
          }
        }

        await product.save();
        return {
          success: true,
          message: "File updated successfully",
        };
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  uploadCatalogue: authenticate(["admin", "seller"])(
    async (_, args, { models }) => {
      try {
        console.log("rrr");

        const product = await models.Product.findById(args.id);
        let filepath;
        if (args.file) {
          const result = await processFile(args.file);
          const responseData = {
            filename: result.uniqueFilename,
          };
          filepath = process.env.BASE_URL + responseData.filename;
        }
        if (filepath) {
          product.catalogue = filepath;
          if (args.filestring) {
            await deleteFile(args.filestring);
          }
        }
        await product.save();
        return {
          success: true,
          message: "File updated successfully.",
        };
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  uploadVideo: authenticate(["admin", "seller"])(
    async (_, args, { models }) => {
      try {
        const product = await models.Product.findById(args.id);
        let filepath;
        if (args.file) {
          const result = await processFile(args.file);
          const responseData = {
            filename: result.uniqueFilename,
          };
          filepath = process.env.BASE_URL + responseData.filename;
        }
        if (filepath) {
          product.video = filepath;
          if (args.filestring) {
            await deleteFile(args.filestring);
          }
        }
        await product.save();
        return {
          success: true,
          message: "File updated successfully.",
        };
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateProduct: authenticate(["admin", "seller"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        let imagesFilePath;
        if (args.productImages && args.productImages.length > 0) {
          const results = await Promise.all(
            args.productImages.map(processFile)
          );
          const responseData = results.map((result) => ({
            image: result.uniqueFilename,
          }));

          imagesFilePath = responseData.map(
            (data) => process.env.BASE_URL + data.image
          );
        }
        const updateFields = {
          variant: [],
          faq: args.faq,
          brand_name: args.brand_name,
          previewName: args.previewName,
          searchName: args.searchName,
          fullName: args.fullName,
          thumbnail: args.thumbnail,
          sku: args.sku,
          returnPolicy: args.returnPolicy,
          shippingPolicy: args.shippingPolicy,
          cancellationPolicy: args.cancellationPolicy,
          description: args.description,
          giftOffer: args.giftOffer,
          sellerNotes: args.sellerNotes,
          policy: args.policy,
          video: args.video,
          active: args.active,
          images: args.images,
          youtubeLink: args.youtubeLink,
          catalogue: args.catalogue,
          categories: args.categories,
        };
        if (imagesFilePath) {
          updateFields.images = [...updateFields.images, ...imagesFilePath];
        }
        if (
          !args.variant ||
          !Array.isArray(args.variant) ||
          args.variant.length === 0
        ) {
          throw new Error("Invalid or missing variant data.");
        }
        const updatedVariants = [];
        for (const data of args.variant) {
          if (
            !data.location ||
            !Array.isArray(data.location) ||
            data.location.length === 0
          ) {
            throw new Error(
              "Invalid or missing serieslocation data for a variant."
            );
          }
          const updatedLocations = [];
          for (const location of data.location) {
            const updatedloc = {
              ...location,
              _id: location.id,
              sellerId: user.seller,
            };
            updatedLocations.push(updatedloc);
          }
          const upvariant = {
            ...data,
            _id: data.id,
            location: updatedLocations,
          };
          updatedVariants.push(upvariant);
        }
        updateFields.variant.push(...updatedVariants);
        const updatedProduct = await models.Product.findByIdAndUpdate(
          args.id,
          updateFields,
          { new: true }
        );
        if (!updatedProduct) {
          throw new Error("Product not found");
        }
        return updatedProduct;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateVariantPricesBySeller: authenticate(["seller", "admin"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) throw new Error("Unauthorized access");

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        if (!user || !user.seller) {
          throw new Error("Seller not found for this user");
        }

        // Step 1: Get product by ID
        const product = await models.Product.findById(args.productId);
        if (!product) throw new Error("Product not found");

        // Step 2: Loop through variants array
        for (const variantInput of args.variants) {
          const { variantId, locations } = variantInput;
          const variant = product.variant.id(variantId);
          if (!variant) continue; // skip invalid ones

          // Step 3: Update only seller’s own locations
          variant.location = variant.location.map((loc) => {
            const matched = locations.find((newLoc) => newLoc.id == loc._id);
            if (matched && String(loc.sellerId) === String(user.seller)) {
              return {
                ...loc.toObject(),
                price: matched.price ?? loc.price,
                gstType: matched.gstType ?? loc.gstType,
                gstRate: matched.gstRate ?? loc.gstRate,
                extraCharge: matched.extraCharge ?? loc.extraCharge,
                transportCharge: matched.transportCharge ?? loc.transportCharge,
                finalPrice: matched.finalPrice ?? loc.finalPrice,
                b2bdiscount: matched.b2bdiscount ?? loc.b2bdiscount,
                b2cdiscount: matched.b2cdiscount ?? loc.b2cdiscount,
                mainStock: matched.mainStock ?? loc.mainStock,
                displayStock: matched.displayStock ?? loc.displayStock,
              };
            }
            return loc;
          });
        }

        await product.save();
        return product;
      } catch (error) {
        console.error("❌ updateVariantPricesBySeller error:", error);
        throw new Error(error.message);
      }
    }
  ),
  activeProduct: authenticate(["admin", "seller"])(
    async (_, args, { models, req }) => {
      try {
        const updated = await models.Product.findByIdAndUpdate(
          args.id,
          { active: args.active },
          { new: true }
        );
        return updated;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateVariant: authenticate(["admin", "seller"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const product = await models.Product.findById(args.id);
        const variant = product.variant.id(args.variantId);
        if (args.variantName) {
          variant.variantName = args.variantName;
        }
        if (args.moq) {
          variant.moq = args.moq;
        }
        if (args.location) {
          const updatedLocations = [];
          for (const location of args.location) {
            const updatedloc = { ...location, sellerId: user.seller };
            updatedLocations.push(updatedloc);
          }
          variant.location = updatedLocations;
        }
        if (args.hsn) {
          variant.hsn = args.hsn;
        }
        if (args.silent_features) {
          variant.hsn = args.silent_features;
        }
        if (args.minimunQty) {
          variant.minimunQty = args.minimunQty;
        }
        variant.active = args.active;
        variant.allPincode = args.allPincode;
        await product.save();
        return product;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  deleteimages: authenticate(["admin", "seller"])(
    async (_, { id, url }, { models }) => {
      try {
        await deleteFile(url);
        const product = await models.Product.findById(id);
        const newImages = product.images.filter((item) => item !== url);
        const upadted = await models.Product.findByIdAndUpdate(
          id,
          { images: newImages },
          { new: true }
        );
        return {
          success: true,
          message: "File deleted successfully.",
        };
      } catch (error) {
        return {
          success: false,
          message: error,
        };
      }
    }
  ),
  deletecatalogue: authenticate(["admin", "seller"])(
    async (_, { id, url }, { models }) => {
      try {
        await deleteFile(url);
        const product = await models.Product.findById(id);
        const newCatalogue = null;
        const upadted = await models.Product.findByIdAndUpdate(
          id,
          { catalogue: newCatalogue },
          { new: true }
        );
        return {
          success: true,
          message: "File deleted successfully.",
        };
      } catch (error) {
        return {
          success: false,
          message: error,
        };
      }
    }
  ),
  deleteProduct: authenticate(["admin", "seller"])(
    async (_, { id }, { models }) => {
      try {
        const deleteProduct = await models.Product.findByIdAndRemove(id);
        return deleteProduct;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  checkCat: async (_, { id }, { models }) => {
    const product = await models.Product.findById(id);
    const responseData = product.categories.map(async (result) => {
      try {
        const cat = await models.Category.findById(result);
      } catch (error) {
        throw new Error(error);
      }
    });

    return product;
  },
};

export const Location = {
  sellerId: async (location, _, { models }) => {
    try {
      const seller = await models.Seller.findById(location.sellerId);
      return seller;
    } catch (error) {
      throw new Error("Failed to fetch seller");
    }
  },
};
