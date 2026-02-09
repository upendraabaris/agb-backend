import { processFile } from "../../services/fileUploadService.js";
import authenticate from "../../middlewares/auth.js";
import { deleteFile } from "../../services/fileUtils.js";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
export const Query = {
  getOrderforSuperSeller: authenticate(["superSeller", "admin"])(
    async (_, __, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const seller = await models.Seller.findOne({ user: decoded._id });
        const order = await models.Order.find({
          paymentStatus: "complete",
        });

        const filteredOrders = [];
        for (const data of order) {
          for (const product of data.orderProducts) {
            const superSellerProduct = await models.SuperSellerProduct.findOne({
              _id: product.productId,
              "supervariant.superlocation.sellerId": seller.id,
            });
            if (superSellerProduct) {
              filteredOrders.push(data);
              break; // Move to the next order if a superSellerProduct is found
            }
          }
        }

        return filteredOrders;
      } catch (error) {
        throw new Error("Failed to fetch product");
      }
    }
  ),
  getSingleOrderforSuperSeller: authenticate(["superSeller"])(
    async (_, { id }, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const seller = await models.Seller.findOne({ user: decoded._id });
        const order = await models.Order.findById(id);

        const fOrderProducts = [];
        for (const product of order.orderProducts) {
          const superSellerProduct = await models.SuperSellerProduct.findOne({
            _id: product.productId,
            "supervariant.superlocation.sellerId": seller.id,
          });
          if (superSellerProduct) {
            fOrderProducts.push(product);
          }
        }
        order.orderProducts = fOrderProducts;

        return order;
      } catch (error) {
        // If an error occurs, throw an error
        throw new Error("Failed to fetch product");
      }
    }
  ),

  getSuperSellerProductByCat: async (
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
      if (discountPercentage) {
        filter["supervariant.superlocation.b2cdiscount"] = {
          $gte: discountPercentage,
        };
      }
      if (minPrice && maxPrice) {
        filter["supervariant.superlocation.price"] = {
          $gte: parseFloat(minPrice),
          $lte: parseFloat(maxPrice),
        };
      }
      let getProductByCategory;
      if (sortBy === "asc") {
        getProductByCategory = await models.SuperSellerProduct.find(
          filter
        ).sort({
          previewName: 1,
        });
      } else if (sortBy === "desc") {
        getProductByCategory = await models.SuperSellerProduct.find(
          filter
        ).sort({
          previewName: -1,
        });
      } else {
        getProductByCategory = await models.SuperSellerProduct.find(filter);
      }
      return getProductByCategory;
    } catch (error) {
      throw new Error(error.message);
    }
  },
  getSuperSellerProduct: async (_, { name }, { models }) => {
    try {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`^${escapedName}$`, "i");
      const byname = await models.SuperSellerProduct.findOne({
        identifier: regex,
      });
      return byname;
    } catch (error) {
      throw new Error("Failed to fetch product");
    }
  },
  getSuperProductBySuperId: async (_, __, { models, req }) => {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const seller = await models.Seller.findOne({ user: decoded._id });
      const superSellerProduct = await models.SuperSellerProduct.find({
        superSellerId: seller.id,
      });
      return superSellerProduct;
    } catch (error) {
      throw new Error("Failed to fetch product");
    }
  },
  getSuperSellerProductEdit: async (_, { name }, { models }) => {
    try {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`^${escapedName}$`, "i");
      const byname = await models.SuperSellerProduct.findOne({
        identifier: regex,
      });
      return byname;
    } catch (error) {
      throw new Error("Failed to fetch product");
    }
  },
  pendingsupersellerproduct: authenticate(["admin", "superSeller", "seller"])(
    async (_, args, { models }) => {
      try {
        const product = await models.SuperSellerProduct.find({
          approve: false,
        });
        return product;
      } catch (error) {
        throw new Error("Failed to fetch product");
      }
    }
  ),
  approvedsupersellerproduct: authenticate(["admin", "superSeller", "seller"])(
    async (_, args, { models }) => {
      try {
        const product = await models.SuperSellerProduct.find({ approve: true });
        return product;
      } catch (error) {
        throw new Error("Failed to fetch product");
      }
    }
  ),
};

export const Mutation = {
  createSuperSellerProduct: authenticate(["admin", "superSeller"])(
    async (_, args, { models, req }) => {
      try { 
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const seller = await models.Seller.findOne({ user: decoded._id });
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
        const superSellerProduct = new models.SuperSellerProduct({
          faq: args.faq,
          superSellerId: seller.id,
          brand_name: args.brand_name,
          previewName: args.previewName,
          fullName: args.fullName,
          identifier: productidentifier,
          seriesType: "super",
          thumbnail: args.thumbnail,
          sku: sku,
          approve: false,
          active: args.active,
          returnPolicy: args.returnPolicy,
          shippingPolicy: args.shippingPolicy,
          cancellationPolicy: args.cancellationPolicy,
          description: args.description,
          giftOffer: args.giftOffer,
          silent_features: args.silent_features,
          sellerNotes: args.sellerNotes,
          video: args.video,
          youtubeLink: args.youtubeLink,
          catalogue: args.catalogue,
          // tmtseriesvariant: args.tmtseriesvariant,
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
        });
        await superSellerProduct.save();
        const updatedVariants = [];
        for (const variant of args.supervariant) {
          const updatedLocation = variant.superlocation.map((location) => ({
            ...location,
            sellerId: seller.id,
            sellerarray: [
              {
                sellerId: seller.id,
                pincode: location.pincode,
                status: true,
              },
            ],
          }));
          updatedVariants.push({
            ...variant,
            superlocation: updatedLocation,
          }); 
        }
        superSellerProduct.supervariant.push(...updatedVariants);
        await superSellerProduct.save();
        return superSellerProduct;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateSuperSellerProduct: authenticate(["admin", "superSeller"])(
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
        const seller = await models.Seller.findOne({ user: decoded._id });
        const product = await models.SuperSellerProduct.findById(args.id);
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
        product.seriesType = "super";
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
        if (args.silent_features) {
          product.silent_features = args.silent_features;
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
        product.approve = args.approve;
        await product.save();
        if (args.variant) {
          const updatedVariants = [];
          for (const data of args.variant) { 
            const productVariantId = product.supervariant.find(
              (item) => item._id.toString() === data.id
            );
            if (!productVariantId) {
              updatedVariants.push(data);
            } else {
              // data.superlocation = productVariantId.superlocation;

              const updatedLocations = [];
              for (const data1 of data.superlocation) { 
                data1.price = data1.price;
                data1.extraChargeType = data1.extraChargeType;
                data1.extraCharge = data1.extraCharge;
                data1.transportChargeType = data1.transportChargeType;
                data1.transportCharge = data1.transportCharge;
                data1.b2bdiscount = data1.b2bdiscount;
                data1.b2cdiscount = data1.b2cdiscount;
                updatedLocations.push(data1);
              }
              data.superlocation = updatedLocations;
              updatedVariants.push(data);
            }
          }
          product.supervariant = updatedVariants;
        }
        await product.save();
        return product;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateDealerLocation: authenticate(["admin", "superSeller", "subBusiness"])(
    async (_, args, { models, req }) => {
      try {
        const decoded = jwt.verify(
          req.headers.authorization.split(" ")[1],
          process.env.JWT_SECRET
        );
        const seller = await models.Seller.findOne({
          user: decoded._id,
        }).lean();
        if (!seller) throw new Error("Seller not found");

        const product = await models.SuperSellerProduct.findById(args.id);
        if (!product) throw new Error("Product not found");

        product.supervariant.forEach((variant) => {
          variant.superlocation.forEach((location) => {
            let sellerEntry = location.sellerarray.find(
              (entry) => entry.sellerId.toString() === seller._id.toString()
            );
            const allottedDealer = seller.allotted.find(
              (dealer) => dealer.dealerId.toString() === seller._id.toString()
            );
            if (args.status === false) {
              location.sellerarray.forEach((entry) => {
                if (entry.sellerId.toString() === seller._id.toString()) {
                  entry.status = false;
                }
              });
            } else if (allottedDealer) {
              const newPincodes = [...new Set(allottedDealer.pincode)].map(
                Number
              );
              sellerEntry
                ? Object.assign(sellerEntry, {
                    pincode: newPincodes,
                    status: true,
                  })
                : location.sellerarray.push({
                    sellerId: seller._id,
                    pincode: newPincodes,
                    status: true,
                  });
            }
          });
        });

        await product.save();
        return product;
      } catch (error) {
        throw new Error(error.message);
      }
    }
  ),
  uploadThumbnail: authenticate(["admin", "superSeller"])(
    async (_, args, { models }) => {
      try {
        const product = await models.SuperSellerProduct.findById(args.id);
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
  uploadCatalogue: authenticate(["admin", "superSeller"])(
    async (_, args, { models }) => {
      try {
        const product = await models.SuperSellerProduct.findById(args.id);
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
  uploadVideo: authenticate(["admin", "superSeller"])(
    async (_, args, { models }) => {
      try {
        const product = await models.SuperSellerProduct.findById(args.id);
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
  deleteSuperSellerProduct: authenticate(["admin", "superSeller"])(
    async (_, { id }, { models }) => {
      try {
        const deleteProduct = await models.SuperSellerProduct.findByIdAndRemove(
          id
        );
        return deleteProduct;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  addLocationToSuperProduct: authenticate([
    "admin",
    "superSeller",
    "subBusiness",
  ])(async (_, args, { models, req }) => {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await models.User.findById(decoded._id);
      const superSellerProduct = await models.SuperSellerProduct.findById(
        args.productId
      );

      for (const data of superSellerProduct.supervariant) {
        if (data.id == args.supervariantId) {
          if (!args.superlocationId) {
            const location = {
              ...args.location,
              price: data.price,
              extraChargeType: data.extraChargeType,
              extraCharge: data.extraCharge,
              transportChargeType: data.transportChargeType,
              transportCharge: data.transportCharge,
              b2cdiscount: data.b2cdiscount,
              b2bdiscount: data.b2bdiscount,
              sellerId: user.seller,
              status: true,
            };
            data.superlocation.push(location);
          } else {
            for (const locationData of data.superlocation) {
              if (locationData.id == args.superlocationId) {
                Object.assign(locationData, { ...args.location });
              }
            }
          }
        }
      }
      await superSellerProduct.save();
      return superSellerProduct;
    } catch (error) {
      throw new Error(error);
    }
  }),
  suppersellerproductapprove: authenticate(["admin"])(
    async (_, args, { models }) => {
      try {
        const product = await models.SuperSellerProduct.findById(args.id);

        if (!product) {
          console.log("product not found");
        }

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
          // send email
          try {
            const sellerID = product.superSellerId;
            const productidentifierupdate = product.identifier.replace(
              / /g,
              "_"
            );
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

          // end mail
        } else {
          // send email
          const sellerID = product.superSellerId;
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

          // end mail
        }

        return product;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
};

export const SuperLocation = {
  sellerId: async (superlocation, _, { models }) => {
    try {
      const seller = await models.Seller.findById(superlocation.sellerId);
      return seller;
    } catch (error) {
      throw new Error("Failed to fetch seller");
    }
  },
};
export const SellerArray = {
  sellerId: async (sellerarray, _, { models }) => {
    try {
      const seller = await models.Seller.findById(sellerarray.sellerId);
      return seller;
    } catch (error) {
      throw new Error("Failed to fatch");
    }
  },
};
