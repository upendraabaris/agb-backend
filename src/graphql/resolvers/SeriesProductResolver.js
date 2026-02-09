import { processFile } from "../../services/fileUploadService.js";
import authenticate from "../../middlewares/auth.js";
import { deleteFile } from "../../services/fileUtils.js";
import jwt from "jsonwebtoken";
import Seller from "../../models/Seller.js";

export const Query = {
  getSeriesProductByCat: async (
    _,
    { category_name, sortBy, discountPercentage, minPrice, maxPrice },
    { models }
  ) => {
    try {
      const escapedName = category_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`^${escapedName}$`, "i");
      const catid = await models.Category.findOne({ name: regex });

      let filter = {
        $and: [{ categories: catid._id }, { active: true }],
      };

      // Apply discount percentage filter
      if (discountPercentage) {
        filter["seriesvariant.serieslocation.b2cdiscount"] = {
          $gte: discountPercentage,
        };
      }

      // Apply price range filter
      if (minPrice && maxPrice) {
        filter["seriesvariant.serieslocation.price"] = {
          $gte: parseFloat(minPrice),
          $lte: parseFloat(maxPrice),
        };
      }

      let getProductByCategory;

      if (sortBy === "asc") {
        getProductByCategory = await models.SeriesProduct.find(filter).sort({
          previewName: 1,
        });
      } else if (sortBy === "desc") {
        getProductByCategory = await models.SeriesProduct.find(filter).sort({
          previewName: -1,
        });
      } else {
        getProductByCategory = await models.SeriesProduct.find(filter);
      }

      return getProductByCategory;
    } catch (error) {
      throw new Error(error.message);
    }
  },
  getSeriesProductBySeller: authenticate(["admin", "seller"])(
    async (_, { seller_id }, { models }) => {
      try {
        const getProductBySeller = await models.SeriesProduct.find({
          "seriesvariant.serieslocation.sellerId": seller_id,
        }).populate("seriesvariant.serieslocation.sellerId");
        return getProductBySeller;
      } catch (error) {
        throw new Error(error.message);
      }
    }
  ),
  getSeriesProductByForSeller: authenticate(["seller", "subBusiness", "enquiry"])(
    async (_, __, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const getProductBySeller = await models.SeriesProduct.find({
          "seriesvariant.serieslocation.sellerId": user.seller,
        }).populate("seriesvariant.serieslocation.sellerId");
        return getProductBySeller;
      } catch (error) {
        throw new Error(error.message);
      }
    }
  ),
  getSeriesVariantByForSeller: authenticate(["admin", "seller"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const getProductBySeller = await models.SeriesProduct.findById(
          args.productId
        );
        const filteredVariants = getProductBySeller.seriesvariant.map(
          (data) => {
            const matchedLocations = data.serieslocation.filter((location) => {
              return String(location.sellerId) === String(user.seller);
            });

            return {
              ...data._doc,
              id: data._id,
              serieslocation: matchedLocations,

              product: {
                id: getProductBySeller._id,
                fullName: getProductBySeller.fullName,
                previewName: getProductBySeller.previewName,
                brand_name: getProductBySeller.brand_name,
                images: getProductBySeller.images,
                thumbnail: getProductBySeller.thumbnail,
                identifier: getProductBySeller.identifier,
                sku: getProductBySeller.sku,
                active: getProductBySeller.active,
                description: getProductBySeller.description,
                productComm: getProductBySeller.productComm,
                productCommType: getProductBySeller.productCommType,
                shippingComm: getProductBySeller.shippingComm,
                shippingCommType: getProductBySeller.shippingCommType,
                fixedComm: getProductBySeller.fixedComm,
                fixedCommType: getProductBySeller.fixedCommType,
                listingComm: getProductBySeller.listingComm,
                listingCommType: getProductBySeller.listingCommType,
              },
            };
          }
        );

        if (filteredVariants.length === 0) {
          // Handle the case where no variants match the seller ID
          console.log("No variants found for the seller");
        } else {
          // Print the filtered variants for the seller 
        }

        return filteredVariants;
      } catch (error) {
        throw new Error(error.message);
      }
    }
  ),
  getSeriesProducts: async (_, { name }, { models }) => {
    try {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`^${escapedName}$`, "i");
      const byname = await models.SeriesProduct.findOne({ identifier: regex });
      return byname;
    } catch (error) {
      throw new Error("Failed to fetch product");
    }
  },
  getSeriesProduct: async (_, { id }, { models }) => {
    try {
      const seriesproduct = await models.SeriesProduct.findById(id);
      return seriesproduct;
    } catch (error) {
      throw new Error("Failed to fetch product");
    }
  },
  // getAllSeriesProduct: async (_, __, { models }) => {
  //   try {
  //     const byname = await models.SeriesProduct.find();
  //     return byname;
  //   } catch (error) {
  //     throw new Error("Failed to fetch product");
  //   }
  // },
  getAllSeriesProduct: async (
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
          { fullName: searchRegex },
          { brand_name: searchRegex },
          { previewName: searchRegex },
          { identifier: searchRegex },
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

      const byname = await models.SeriesProduct.find({
        ...query,
      })
        // .populate("variant.location")
        .collation(collationOptions)
        .sort(sortOptions)
        .limit(limit)
        .skip(offset);
      return byname;
    } catch (error) {
      console.error("Error fetching product:", error);
      throw new Error("Failed to fetch product");
    }
  },
  getSeriesProductByCatId: async (_, { cat_id }, { models }) => {
    try {
      const product = await models.SeriesProduct.find({ categories: cat_id });
      return product;
    } catch (error) {
      throw new Error(error.message);
    }
  },
};

export const Mutation = {
  createSeriesProduct: authenticate(["admin"])(
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

        const seriesProduct = new models.SeriesProduct({
          faq: args.faq,
          brand_name: args.brand_name,
          previewName: args.previewName,
          fullName: args.fullName,
          identifier: productidentifier,
          seriesType: args.seriesType || "normal",
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
          categories: args.categories,
          listingCommType: args.listingCommType,
          listingComm: args.listingComm,
          productCommType: args.productCommType,
          productComm: args.productComm,
          shippingCommType: args.shippingCommType,
          shippingComm: args.shippingComm,
          fixedCommType: args.fixedCommType,
          fixedComm: args.fixedComm,
          images: imagesfilepath,
          table: args.table,
        });

        await seriesProduct.save();
        return seriesProduct;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateSeriesProduct: authenticate(["admin", "seller"])(
    async (_, args, { models, req }) => {
      try {
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
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const product = await models.SeriesProduct.findById(args.id);
        const random = Math.floor(Math.random() * 90000) + 10000;
        const sku = `${args.previewName}-${args.brand_name}-${random}`;
        product.sku = sku;
        if (args.faq) {
          product.faq = args.faq;
        }
        if (args.brand_name) {
          product.brand_name = args.brand_name;
        }
        if (args.previewName) {
          product.previewName = args.previewName;
        }
        if (args.fullName) {
          product.fullName = args.fullName;
        }
        // product.seriesType = "normal";
        if (args.thumbnail) {
          product.thumbnail = args.thumbnail;
        }
        if (args.returnPolicy) {
          product.returnPolicy = args.returnPolicy;
        }
        if (args.shippingPolicy) {
          product.shippingPolicy = args.shippingPolicy;
        }
        if (args.cancellationPolicy) {
          product.cancellationPolicy = args.cancellationPolicy;
        }
        if (args.description) {
          product.description = args.description;
        }
        if (args.giftOffer) {
          product.giftOffer = args.giftOffer;
        }
        if (args.sellerNotes) {
          product.sellerNotes = args.sellerNotes;
        }
        if (args.policy) {
          product.policy = args.policy;
        }
        if (args.video) {
          product.video = args.video;
        }
        if (args.youtubeLink) {
          product.youtubeLink = args.youtubeLink;
        }
        if (args.catalogue) {
          product.catalogue = args.catalogue;
        }
        if (args.categories) {
          product.categories = args.categories;
        }
        if (imagesFilePath) {
          product.images = [...product.images, ...imagesFilePath];
        }
        if (args.listingCommType) {
          product.listingCommType = args.listingCommType;
        }
        if (args.listingComm !== undefined && args.listingComm !== null) {
          product.listingComm = args.listingComm;
        }
        if (args.productCommType) {
          product.productCommType = args.productCommType;
        }
        if (args.productComm !== undefined && args.productComm !== null) {
          product.productComm = args.productComm;
        }
        if (args.shippingCommType) {
          product.shippingCommType = args.shippingCommType;
        }
        if (args.shippingComm !== undefined && args.shippingComm !== null) {
          product.shippingComm = args.shippingComm;
        }
        if (args.fixedCommType) {
          product.fixedCommType = args.fixedCommType;
        }
        if (args.fixedComm !== undefined && args.fixedComm !== null) {
          product.fixedComm = args.fixedComm;
        }

        product.active = args.active;
        product.table = args.table;
        await product.save();
        return product;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  uploadSeriesThumbnail: authenticate(["admin", "seller"])(
    async (_, args, { models }) => {
      try {
        const product = await models.SeriesProduct.findById(args.id);
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
  uploadSeriesCatalogue: authenticate(["admin", "seller"])(
    async (_, args, { models }) => {
      try {
        const product = await models.SeriesProduct.findById(args.id);
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
  uploadSeriesVideo: authenticate(["admin", "seller"])(
    async (_, args, { models }) => {
      try {
        const product = await models.SeriesProduct.findById(args.id);
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
  deleteseriesimages: authenticate(["admin", "seller"])(
    async (_, { id, url }, { models }) => {
      try {
        await deleteFile(url);
        const product = await models.SeriesProduct.findById(id);
        const newImages = product.images.filter((item) => item !== url);
        const upadted = await models.SeriesProduct.findByIdAndUpdate(
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
  addSeriesVariant: authenticate(["admin", "seller"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
          throw new Error("Authorization token missing.");
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);

        if (!user) {
          throw new Error("User not found.");
        }

        const updatedSeriesProduct = await models.SeriesProduct.findById(
          args.id
        );
        if (!updatedSeriesProduct) {
          throw new Error("Product not found.");
        }

        if (
          !args.seriesvariant ||
          !Array.isArray(args.seriesvariant) ||
          args.seriesvariant.length === 0
        ) {
          throw new Error("Invalid or missing seriesvariant data.");
        }

        const updatedVariants = [];

        for (const data of args.seriesvariant) {
          if (
            !data.serieslocation ||
            !Array.isArray(data.serieslocation) ||
            data.serieslocation.length === 0
          ) {
            throw new Error(
              "Invalid or missing serieslocation data for a variant."
            );
          }

          const updatedLocations = [];

          for (const location of data.serieslocation) {
            const updatedloc = { ...location, sellerId: user.seller };
            updatedLocations.push(updatedloc);
          }

          data.serieslocation = updatedLocations;
          updatedVariants.push(data);
        }

        updatedSeriesProduct.seriesvariant.push(...updatedVariants);
        await updatedSeriesProduct.save();

        return updatedSeriesProduct;
      } catch (error) {
        throw new Error(`Error adding series variant: ${error.message}`);
      }
    }
  ),
  multipleSellerAddVariant: authenticate(["admin"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
          throw new Error("Authorization token missing.");
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        if (!user) {
          throw new Error("User not found.");
        }
        const updatedSeriesProduct = await models.SeriesProduct.findById(
          args.id
        );
        if (!updatedSeriesProduct) {
          throw new Error("Product not found.");
        }
        if (
          !args.seriesvariant ||
          !Array.isArray(args.seriesvariant) ||
          args.seriesvariant.length === 0
        ) {
          throw new Error("Invalid or missing seriesvariant data.");
        }
        const updatedVariants = [];
        for (const data of args.seriesvariant) {
          const variantData = {
            variantName: data.variantName,
            hsn: data.hsn,
            allPincode: data.allPincode,
            silent_features: data.silent_features,
            active: true,
            moq: data.moq,
            finalPrice: data.finalPrice,
            transportChargeType: data.transportChargeType,
            extraChargeType: data.extraChargeType,
            gstType: data.gstType,
            gstRate: data.gstRate,
            unitType: data.unitType,
            priceType: data.priceType,
          };
          updatedVariants.push(variantData);
        }
        updatedSeriesProduct.seriesvariant.push(...updatedVariants);
        await updatedSeriesProduct.save();
        return updatedSeriesProduct;
      } catch (error) {
        throw new Error(
          `Error adding multiple seller variants: ${error.message}`
        );
      }
    }
  ),
  updateSeriesVariantById: authenticate(["admin", "seller"])(
    async (
      _,
      {
        variantId,
        variantName,
        hsn,
        moq,
        active,
        silent_features,
        finalPrice,
        transportChargeType,
        extraChargeType,
        gstType,
        gstRate,
        unitType,
        priceType,
      },
      { models }
    ) => {
      try {
        const product = await models.SeriesProduct.findOne({
          "seriesvariant._id": variantId,
        });
        if (!product) {
          throw new Error("Variant not found");
        }
        const variantIndex = product.seriesvariant.findIndex(
          (v) => v._id.toString() === variantId
        );
        if (variantIndex === -1) {
          throw new Error("Variant not found in product");
        }
        if (variantName !== undefined)
          product.seriesvariant[variantIndex].variantName = variantName;
        if (hsn !== undefined) product.seriesvariant[variantIndex].hsn = hsn;
        if (moq !== undefined) product.seriesvariant[variantIndex].moq = moq;
        if (active !== undefined)
          product.seriesvariant[variantIndex].active = active;
        if (silent_features !== undefined)
          product.seriesvariant[variantIndex].silent_features = silent_features;
        if (finalPrice !== undefined)
          product.seriesvariant[variantIndex].finalPrice = finalPrice;
        if (transportChargeType !== undefined)
          product.seriesvariant[variantIndex].transportChargeType =
            transportChargeType;
        if (extraChargeType !== undefined)
          product.seriesvariant[variantIndex].extraChargeType = extraChargeType;
        if (gstType !== undefined)
          product.seriesvariant[variantIndex].gstType = gstType;
        if (gstRate !== undefined)
          product.seriesvariant[variantIndex].gstRate = gstRate;
        if (unitType !== undefined)
          product.seriesvariant[variantIndex].unitType = unitType;
        if (priceType !== undefined)
          product.seriesvariant[variantIndex].priceType = priceType;
        await product.save();
        return product.seriesvariant[variantIndex];
      } catch (error) {
        throw new Error(error.message);
      }
    }
  ),
  updateSeriesVariant: authenticate(["admin", "seller"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const updatedSeriesProduct = await models.SeriesProduct.findById(
          args.id
        );
        const variant = updatedSeriesProduct.seriesvariant.id(args.variantId);
        if (args.variantName) {
          variant.variantName = args.variantName;
        }
        if (args.moq) {
          variant.moq = args.moq;
        }
        if (args.hsn) {
          variant.hsn = args.hsn;
        }
        variant.allPincode = args.allPincode;
        if (args.silent_features) {
          variant.silent_features = args.silent_features;
        }
        if (args.locationId) {
          let locationdetail = variant.serieslocation.id(args.locationId);
          const updateloction = {
            ...args.location,
            sellerId: locationdetail.sellerId,
          };
          const index = variant.serieslocation.findIndex(
            (obj) => obj.id === args.locationId
          );
          if (index !== -1) {
            variant.serieslocation[index] = updateloction;
          }
        }
        if (args.location && !args.locationId) {
          const updateloction = {
            ...args.location,
            _id: args.location.id,
            // sellerId: decoded._id,
            sellerId: user.seller.toString(),
          };
          variant.serieslocation.push(updateloction);
        }
        await updatedSeriesProduct.save();
        return updatedSeriesProduct;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateSeriesVariantMultiSeller: authenticate(["admin", "seller"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const updatedSeriesProduct = await models.SeriesProduct.findById(
          args.id
        );
        const variant = updatedSeriesProduct.seriesvariant.id(args.variantId);
        if (args.variantName) {
          variant.variantName = args.variantName;
        }
        if (args.moq) {
          variant.moq = args.moq;
        }
        if (args.hsn) {
          variant.hsn = args.hsn;
        }
        variant.allPincode = args.allPincode;
        if (args.silent_features) {
          variant.silent_features = args.silent_features;
        }
        if (args.locationId) { 
          let locationdetail = variant.serieslocation.id(args.locationId);
          const updateloction = {
            ...args.location,
            sellerId: locationdetail.sellerId,
          };
          const index = variant.serieslocation.findIndex(
            (obj) => obj.id === args.locationId
          );
          if (index !== -1) {
            variant.serieslocation[index] = updateloction;
          }
        }
        if (args.location && !args.locationId) { 
          const updateloction = {
            ...args.location,
            _id: args.location.id,
            unitType: variant.unitType,
            priceType: variant.priceType,
            finalPrice: variant.finalPrice,
            transportChargeType: variant.transportChargeType,
            extraChargeType: variant.extraChargeType,
            gstType: variant.gstType,
            gstRate: variant.gstRate,
            // sellerId: decoded._id,
            sellerId: user.seller.toString(),
          };
          variant.serieslocation.push(updateloction);
        }
        await updatedSeriesProduct.save();
        return updatedSeriesProduct;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  deleteSeriesProduct: authenticate(["admin", "seller"])(
    async (_, { id }, { models }) => {
      try {
        const deleteProduct = await models.SeriesProduct.findByIdAndRemove(id);
        return deleteProduct;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  deleteSeriesVariant: authenticate(["admin", "seller"])(
    async (_, { variantId }, { models }) => {
      try {
        const product = await models.SeriesProduct.findOne({
          "seriesvariant._id": variantId,
        });

        if (!product) {
          throw new Error("Variant not found");
        }

        product.seriesvariant = product.seriesvariant.filter(
          (variant) => variant._id.toString() !== variantId
        );

        await product.save();

        return {
          id: variantId,
          message: "Variant deleted successfully",
        };
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
};

export const SeriesLocation = {
  sellerId: async (serieslocation, _, { models }) => {
    try {
      const seller = await models.Seller.findById(serieslocation.sellerId);
      return seller;
    } catch (error) {
      throw new Error("Failed to fetch seller");
    }
  },
};
