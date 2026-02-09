import authenticate from "../../middlewares/auth.js";
import jwt from "jsonwebtoken";

export const Query = {
  // getTmtMaster: async (_, __, { models }) => {
  //   try {
  //     const byname = await models.TMTMaster.find();
  //     return byname;
  //   } catch (error) {
  //     throw new Error("Failed to fetch product");
  //   }
  // },

  getTmtMaster: async (
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
          { brandCompareCategory: searchRegex },
          // { categories: searchRegex },
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

      const byname = await models.TMTMaster.find({
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

  getTmtMasterByBrandCat: authenticate(["seller", "admin"])(
    async (_, args, { models }) => {
      try {
        const tmtMaster = await models.TMTMaster.findOne({
          brandCompareCategory: args.brandCompareCategory,
        });
        return tmtMaster;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
};

export const Mutation = {
  createTMTMaster: authenticate(["admin"])(async (_, args, { models, req }) => {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await models.User.findById(decoded._id);
      // const random = Math.floor(Math.random() * 90000) + 10000;
      // const productidentifier = `${args.fullName}-${random}`;

      // const results = await Promise.all(args.productImages.map(processFile));
      // const responseData = results.map((result) => ({
      //   image: result.uniqueFilename,
      // }));

      // const imagesfilepath = responseData.map(
      //   (data) => process.env.BASE_URL + data.image
      // );

      const tmtSeriesProduct = new models.TMTMaster({
        seriesType: "tmt",
        categories: args.categories,
        section: args.section,
        brandCompareCategory: args.brandCompareCategory,
        listingCommType: args.listingCommType,
        listingComm: args.listingComm,
        productCommType: args.productCommType,
        productComm: args.productComm,
        shippingCommType: args.shippingCommType,
        shippingComm: args.shippingComm,
        fixedCommType: args.fixedCommType,
        fixedComm: args.fixedComm,
      });

      await tmtSeriesProduct.save();
      return tmtSeriesProduct;
    } catch (error) {
      throw new Error(error);
    }
  }),
  updateTMTMaster: authenticate(["admin"])(async (_, args, { models, req }) => {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await models.User.findById(decoded._id);
      const product = await models.TMTMaster.findById(args.id);

      if (args.categories) {
        product.categories = args.categories;
      }
      if (args.brandCompareCategory) {
        product.brandCompareCategory = args.brandCompareCategory;
      }
      product.section = args.section;
      product.listingCommType = args.listingCommType;
      product.listingComm = args.listingComm;
      product.productCommType = args.productCommType;
      product.productComm = args.productComm;
      product.shippingCommType = args.shippingCommType;
      product.shippingComm = args.shippingComm;
      product.fixedCommType = args.fixedCommType;
      product.fixedComm = args.fixedComm;

      await product.save();
      return product;
    } catch (error) {
      throw new Error(error);
    }
  }),
  addTMTMasterVariant: authenticate(["admin", "seller"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);

        const updatedTMTSeriesProduct = await models.TMTMaster.findOne({
          brandCompareCategory: args.brandCompare,
        });
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
  updateTMTMasterVariant: authenticate(["admin", "seller"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);

        const updatedTMTSeriesProduct = await models.TMTMaster.findById(
          args.id
        );
        if (!updatedTMTSeriesProduct) {
          throw new Error("Product not found");
        }
        const variant = updatedTMTSeriesProduct.tmtseriesvariant.id(
          args.variantId
        );
        if (args.variantName) {
          variant.variantName = args.variantName;
        }
        if (args.moq) {
          variant.moq = args.moq;
        }
        if (args.hsn) {
          variant.hsn = args.hsn;
        }
        if (args.silent_features) {
          variant.silent_features = args.silent_features;
        }

        await updatedTMTSeriesProduct.save();
        return updatedTMTSeriesProduct;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  deleteTMTMaster: authenticate(["admin", "seller"])(
    async (_, { id }, { models }) => {
      try {
        const deleteProduct = await models.TMTMaster.findByIdAndRemove(id);
        return deleteProduct;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  deleteTMTMasterVariant: async (_, { id, variantId }, { models }) => {
    try {
      const tmtMaster = await models.TMTMaster.findById(id);      
      if (!tmtMaster) {
        throw new Error("TMT Master not found");
      }      
      tmtMaster.tmtseriesvariant = tmtMaster.tmtseriesvariant.filter(
        (v) => v._id.toString() !== variantId
      );
      await tmtMaster.save();
      return tmtMaster;
    } catch (err) {
      throw new Error(err.message || "Error deleting variant");
    }
  },
};

export const TMTMaster = {};
