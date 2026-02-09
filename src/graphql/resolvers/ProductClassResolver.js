// src/graphql/resolvers/ShippingResolver.js
import authenticate from "../../middlewares/auth.js";
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
  getProductClass: async (_, { id }, { models }) => {
    try {
      return await models.ProductClass.findById(id);
    } catch (error) {
      throw new Error(error);
    }
  },
  getAllProductClass: async (_, __, { models }) => {
    try {
      return await models.ProductClass.find();
    } catch (error) {
      throw new Error(error);
    }
  },
  // getProductClass: async (
  //   _,
  //   { search, limit, offset, sortBy, sortOrder },
  //   { models }
  // ) => {
  //   try {
  //     const query = {};

  //     if (search) {
  //       // Use a case-insensitive regular expression to search for users
  //       const searchRegex = new RegExp(search, "i");
  //       query.$or = [{ productClassName: searchRegex }, { code: searchRegex }];
  //     }

  //     const sortOptions = {};

  //     // Check if a sort field is provided
  //     if (sortBy) {
  //       // Use a case-insensitive regular expression for sorting
  //       // const sortField = sortBy;
  //       sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
  //     }

  //     const collationOptions = {
  //       locale: "en",
  //       strength: 2,
  //     };

  //     return await models.ProductClass.find(query)
  //       .collation(collationOptions)
  //       .sort(sortOptions)
  //       .limit(limit)
  //       .skip(offset);
  //   } catch (error) {
  //     throw new Error(error);
  //   }
  // },
};

export const Mutation = {
  createProductClass: authenticate(["admin"])(
    async (
      _,
      {
        productClassName,
        productClassDescription,
        code,
        listingCommission,
        listingType,
        productCommission,
        productType,
        fixedCommission,
        fixedType,
        shippingCommission,
        shippingType,
        specialStatus,
      },
      { models }
    ) => {
      try {
        const code = await generateUniqueCode(models, productClassName);
        const newProductClass = new models.ProductClass({
          productClassName,
          productClassDescription,
          code,
          listingCommission,
          listingType,
          productCommission,
          productType,
          fixedCommission,
          fixedType,
          shippingCommission,
          shippingType,
          specialStatus,
        });
        return await newProductClass.save();
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateProductClass: authenticate(["admin"])(
    async (_, { id, ...args }, { models }) => {
      try {
        const updatedProductClass = await models.ProductClass.findByIdAndUpdate(
          id,
          args,
          { new: true }
        );
        try {
          const products = await models.Product.find({
            classCode: updatedProductClass.code,
          });
          
          if (products.length > 0) {
            await Promise.all(
              products.map(async (product) => {
                product.listingCommType = updatedProductClass.listingType;
                product.listingComm = updatedProductClass.listingCommission;
                product.productCommType = updatedProductClass.productType;
                product.productComm = updatedProductClass.productCommission;
                product.shippingCommType = updatedProductClass.shippingType;
                product.shippingComm = updatedProductClass.shippingCommission;
                product.fixedCommType = updatedProductClass.fixedType;
                product.fixedComm = updatedProductClass.fixedCommission;
                product.specialStatus = updatedProductClass.specialStatus;
                await product.save();
              })
            );
          } else {
            throw new Error(
              `Products with classCode ${updatedProductClass.code} not found`
            );
          }
        } catch (error) {
          console.error("Error updating products:", error.message);
        }
        const allSellers = await models.Seller.find();         
        // allSellers.forEach(async (seller) => {
        //   const master = await models.StoreFeature.findOne({});
        //   const emaildata = await models.SiteContent.findOne({
        //     key: "productClass",
        //   });
        //   const emaildatasubject = await models.SiteContent.findOne({
        //     key: "productClassSubject",
        //   });
        //   const adminemail = await models.SiteContent.findOne({
        //     key: "adminEnquiryEmail",
        //   });
        //   const inputString = emaildata.content;
        //   const inputStringsubject = emaildatasubject.content;
        //   const params = {
        //     $companyname: seller.companyName,
        //     $mobile: seller.mobileNo,
        //     $email: seller.email,
        //     $className: updatedProductClass.productClassName,
        //     $productType: updatedProductClass.productType,
        //     $productCommission: updatedProductClass.productCommission,
        //     $listingType: updatedProductClass.listingType,
        //     $listingCommission: updatedProductClass.listingCommission,
        //     $fixedType: updatedProductClass.fixedType,
        //     $fixedCommission: updatedProductClass.fixedCommission,
        //     $shippingType: updatedProductClass.shippingType,
        //     $shippingCommission: updatedProductClass.shippingCommission,
        //     $website: master.storeName,
        //   };
        //   const subject = inputStringsubject;
        //   const modifiedsubject = subject.replace(
        //     /\$\w+/g,
        //     (match) => params[match] || match
        //   );
        //   const modifiedString = inputString.replace(
        //     /\$\w+/g,
        //     (match) => params[match] || match
        //   );
        //   const mailOptions = {
        //     from: process.env.SMTP_USER,
        //     // to: seller.email,
        //     cc: [adminemail.content],
        //     subject: modifiedsubject,
        //     html: modifiedString.replace(/<br>/g, ""),
        //   };
        //   await transporter.sendMail(mailOptions);
        // });
        return updatedProductClass;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  deleteProductClass: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      // await deleteChildren(id);
      const deletedReview = await models.ProductClass.findByIdAndRemove(id);
      return deletedReview;
    } catch (error) {
      throw new Error(error);
    }
  }),
  // addAdminRole: authenticate(["masterAdmin"])(
  //   async (_, { userID }, { models }) => {
  //     try {
  //       const user = await models.User.findById(userID);
  //       if (!user) {
  //         return { message: "user not found" };
  //       }
  //       user.role.push("admin");
  //       await user.save();
  //       return { message: "user is now admin" };
  //     } catch (error) {
  //       throw new Error(error);
  //     }
  //   }
  // ),
  // removeAdminRole: authenticate(["masterAdmin"])(
  //   async (_, { userID }, { models }) => {
  //     try {
  //       const user = await models.User.findById(userID);
  //       if (!user) {
  //         return { message: "user not found" };
  //       }
  //       const newRole = user.role.filter((item) => item !== "admin");
  //       user.role = newRole;
  //       await user.save();
  //       return { message: "user is not admin" };
  //     } catch (error) {
  //       throw new Error(error);
  //     }
  //   }
  // ),
};

// Helper function to generate unique code
async function generateUniqueCode(models, productClassName) {
  const firstChar = productClassName.charAt(0).toUpperCase();
  let uniqueCode;
  let isUnique = false;

  // Continue generating a new code until a unique one is found
  while (!isUnique) {
    const randomDigits = Math.floor(10000 + Math.random() * 90000); // Generate a 5-digit number
    uniqueCode = `${firstChar}${randomDigits}`;

    // Check if the generated code already exists in the database
    const existingProductClass = await models.ProductClass.findOne({
      code: uniqueCode,
    });
    if (!existingProductClass) {
      isUnique = true;
    }
  }

  return uniqueCode;
}

export const ProductClass = {};
