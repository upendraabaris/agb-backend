import { processFile } from "../../services/fileUploadService.js";
import authenticate from "../../middlewares/auth.js";
import { deleteFile } from "../../services/fileUtils.js";
import jwt from "jsonwebtoken";

export const Query = {
  getTMTSeriesProductByCat: async (
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
        filter["tmtseriesvariant.tmtserieslocation.b2cdiscount"] = {
          $gte: discountPercentage,
        };
      }

      // Apply price range filter
      if (minPrice && maxPrice) {
        filter["tmtseriesvariant.tmtserieslocation.price"] = {
          $gte: parseFloat(minPrice),
          $lte: parseFloat(maxPrice),
        };
      }

      let getProductByCategory;

      if (sortBy === "asc") {
        getProductByCategory = await models.TMTSeriesProduct.find(filter).sort({
          previewName: 1,
        });
      } else if (sortBy === "desc") {
        getProductByCategory = await models.TMTSeriesProduct.find(filter).sort({
          previewName: -1,
        });
      } else {
        getProductByCategory = await models.TMTSeriesProduct.find(filter);
      }

      return getProductByCategory;
    } catch (error) {
      throw new Error(error.message);
    }
  },
  getTMTSeriesProductByCatId: async (_, { cat_id }, { models }) => {
    try {
      const product = await models.TMTSeriesProduct.find({
        categories: cat_id,
      });
      return product;
    } catch (error) {
      throw new Error(error.message);
    }
  },
  // getAllTMTSeriesProduct: async (_, __, { models }) => {
  //   try {
  //     const byname = await models.TMTSeriesProduct.find();
  //     return byname;
  //   } catch (error) {
  //     throw new Error("Failed to fetch product");
  //   }
  // },

  getAllTMTSeriesProduct: async (
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
          { brand_name: searchRegex },
          { fullName: searchRegex },
          { identifier: searchRegex },
          { brandCompareCategory: searchRegex },
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

      const byname = await models.TMTSeriesProduct.find({
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

  getAllTMTSeriesProductForSeller: async (_, __, { models, req }) => {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await models.User.findById(decoded._id);
      const byname = await models.TMTSeriesProduct.find({
        "tmtseriesvariant.tmtserieslocation.sellerId": user.seller,
      });
      return byname;
    } catch (error) {
      throw new Error("Failed to fetch product");
    }
  },
  getTMTSeriesProduct: async (_, { id }, { models }) => {
    try {
      const seriesproduct = await models.TMTSeriesProduct.findById(id);
      return seriesproduct;
    } catch (error) {
      throw new Error("Failed to fetch product");
    }
  },
  getTMTSeriesProductByName: async (_, { name }, { models }) => {
    try {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`^${escapedName}$`, "i");
      const byname = await models.TMTSeriesProduct.findOne({
        identifier: regex,
      });
      return byname;
    } catch (error) {
      throw new Error("Failed to fetch product");
    }
  },
  getTMTSeriesProductByCompare: async (_, { name, pincode }, { models }) => {
    try {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`^${escapedName}$`, "i");
      const byname = await models.TMTSeriesProduct.find({
        brandCompareCategory: regex,
        $or: [
          { "tmtseriesvariant.allPincode": true }, 
          { "tmtseriesvariant.tmtserieslocation.pincode": pincode }, 
        ],
      });
      return byname;
    } catch (error) {
      throw new Error("Failed to fetch product");
    }
  },
};

export const Mutation = {
  createTMTSeriesProduct: authenticate(["admin", "seller"])(
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

        const tmtSeriesProduct = new models.TMTSeriesProduct({
          faq: args.faq,
          brand_name: args.brand_name,
          previewName: args.previewName,
          fullName: args.fullName,
          identifier: productidentifier,
          seriesType: "tmt",
          thumbnail: args.thumbnail,
          sku: sku,
          approve: true,
          active: args.active,
          section: args.section,
          returnPolicy: args.returnPolicy,
          shippingPolicy: args.shippingPolicy,
          cancellationPolicy: args.cancellationPolicy,
          description: args.description,
          giftOffer: args.giftOffer,
          sellerNotes: args.sellerNotes,
          policy: args.policy,
          video: args.video,
          youtubeLink: args.youtubeLink,
          catalogue: args.catalogue,
          // tmtseriesvariant: args.tmtseriesvariant,
          categories: args.categories,
          sectionDiff: args.sectionDiff,
          brandCompareCategory: args.brandCompareCategory,
          listingCommType: args.listingCommType,
          listingComm: args.listingComm,
          productCommType: args.productCommType,
          productComm: args.productComm,
          shippingCommType: args.shippingCommType,
          shippingComm: args.shippingComm,
          fixedCommType: args.fixedCommType,
          fixedComm: args.fixedComm,
          images: imagesfilepath,
        });

        await tmtSeriesProduct.save();
        const updatedVariants = [];

        for (const data of args.tmtseriesvariant) {
          if (
            !data.tmtserieslocation ||
            !Array.isArray(data.tmtserieslocation) ||
            data.tmtserieslocation.length === 0
          ) {
            throw new Error(
              "Invalid or missing tmtserieslocation data for a variant."
            );
          }

          const updatedLocations = [];

          for (const location of data.tmtserieslocation) {
            const updatedloc = { ...location, sellerId: user.seller };
            updatedLocations.push(updatedloc);
          }

          data.tmtserieslocation = updatedLocations;
          updatedVariants.push(data);
        }

        tmtSeriesProduct.tmtseriesvariant.push(...updatedVariants);
        await tmtSeriesProduct.save();
        return tmtSeriesProduct;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  updateTMTPriceBySD: authenticate(["admin", "seller"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const updatedTMTSeriesProduct = await models.TMTSeriesProduct.findById(
          args.id
        );
        if (!updatedTMTSeriesProduct) {
          throw new Error("Product not found");
        }

        const variant = updatedTMTSeriesProduct.tmtseriesvariant.map((data) => {         
          const location = data.tmtserieslocation.map((location) => {           
            location.price = args.price + location.sectionDiff;
          });
        });
        updatedTMTSeriesProduct.priceUpdateDate = new Date();
        await updatedTMTSeriesProduct.save();
        return updatedTMTSeriesProduct;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  uploadTmtSeriesThumbnail: authenticate(["admin", "seller"])(
    async (_, args, { models }) => {
      try {       
        const product = await models.TMTSeriesProduct.findById(args.id);
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
  uploadTmtSeriesCatalogue: authenticate(["admin", "seller"])(
    async (_, args, { models }) => {
      try { 
        const product = await models.TMTSeriesProduct.findById(args.id);
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
  uploadTmtSeriesVideo: authenticate(["admin", "seller"])(
    async (_, args, { models }) => {
      try {
        const product = await models.TMTSeriesProduct.findById(args.id);
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

  updateTMTSereiesProduct: authenticate(["seller", "admin"])(
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
        const product = await models.TMTSeriesProduct.findById(args.id);
        const random = Math.floor(Math.random() * 90000) + 10000;
        const sku = `${args.previewName}-${args.brand_name}-${random}`;

        if (args.faq) {
          product.faq = args.faq;
        }

        if (args.brand_name) {
          product.brand_name = args.brand_name;
        }
        if (args.brandCompareCategory) {
          product.brandCompareCategory = args.brandCompareCategory;
        }
        if (args.previewName) {
          product.previewName = args.previewName;
        }
        if (args.fullName) {
          product.fullName = args.fullName;
        }
        product.seriesType = "tmt";
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
        if (args.listingComm) {
          product.listingComm = args.listingComm;
        }
        if (args.productCommType) {
          product.productCommType = args.productCommType;
        }
        if (args.productComm) {
          product.productComm = args.productComm;
        }
        if (args.shippingCommType) {
          product.shippingCommType = args.shippingCommType;
        }
        if (args.shippingComm) {
          product.shippingComm = args.shippingComm;
        }
        if (args.fixedCommType) {
          product.fixedCommType = args.fixedCommType;
        }
        if (args.fixedComm) {
          product.fixedComm = args.fixedComm;
        }
        product.active = args.active;
        product.approve = true;
        await product.save();

        if (args.tmtseriesvariant) {
          const updatedVariants = [];

          for (const data of args.tmtseriesvariant) {
            if (
              !data.tmtserieslocation ||
              !Array.isArray(data.tmtserieslocation) ||
              data.tmtserieslocation.length === 0
            ) {
              throw new Error(
                "Invalid or missing tmtserieslocation data for a variant."
              );
            }

            const updatedLocations = [];

            for (const location of data.tmtserieslocation) {
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
              tmtserieslocation: updatedLocations,
            };

            updatedVariants.push(upvariant);
          }

          product.tmtseriesvariant = updatedVariants;
        }

        await product.save();
        return product;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  addTMTSeriesVariant: authenticate(["admin", "seller"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);

        const updatedTMTSeriesProduct = await models.TMTSeriesProduct.findById(
          args.id
        );
        if (!updatedTMTSeriesProduct) {
          throw new Error("Product not found");
        }

        // args.tmtseriesvariant.map(async (data) => {
        //   updatedTMTSeriesProduct.tmtseriesvariant.push(data);
        //   await updatedTMTSeriesProduct.save();
        // });

        for (const data of args.tmtseriesvariant) {
          updatedTMTSeriesProduct.tmtseriesvariant.push(data);
          await updatedTMTSeriesProduct.save();
        }

        return updatedTMTSeriesProduct;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  deleteTMTSeriesProduct: authenticate(["admin", "seller"])(
    async (_, { id }, { models }) => {
      try {
        const deleteProduct = await models.TMTSeriesProduct.findByIdAndRemove(
          id
        );
        return deleteProduct;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  deleteTmtSeriesimages: authenticate(["admin", "seller"])(
    async (_, { id, url }, { models }) => {
      try {
        await deleteFile(url);
        const product = await models.TMTSeriesProduct.findById(id);
        const newImages = product.images.filter((item) => item !== url);
        const upadted = await models.TMTSeriesProduct.findByIdAndUpdate(
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
};

export const TMTSeriesLocation = {
  sellerId: async (tmtserieslocation, _, { models }) => {
    try {
      const seller = await models.Seller.findById(tmtserieslocation.sellerId);
      return seller;
    } catch (error) {
      throw new Error("Failed to fetch seller");
    }
  },
};
