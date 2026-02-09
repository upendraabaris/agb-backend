// src/graphql/resolvers/ReviewResolver.js
import { processFile } from "../../services/fileUploadService.js";
import authenticate from "../../middlewares/auth.js";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import StoreFeature from "../../models/StoreFeature.js";
import SiteContent from "../../models/SiteContent.js";
import Product from "../../models/Product.js";
import Seller from "../../models/Seller.js";
import mongoose from "mongoose";

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
  getReview: authenticate(["admin", "seller", "customer"])(
    async (_, { id }, { models }) => {
      try {
        return await models.Review.findById(id);
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  getReviewByOrderId: authenticate(["customer"])(
    async (_, { id }, { models }) => {
      try {
        const reviews = await models.Review.find({
          orderId: new mongoose.Types.ObjectId(id),
        });

        return reviews.length ? reviews : [];
      } catch (error) {
        throw new Error(error.message);
      }
    }
  ),

  getReviewByProduct: async (_, { productId }, { models }) => {
    try {
      return await models.Review.find({ productId: productId });
    } catch (error) {
      throw new Error(error);
    }
  },

  getAllReviews: authenticate(["admin", "customer"])(
    async (_, args, { models }) => {
      try {
        return await models.Review.find();
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  getReviewsBySeller: authenticate(["customer"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        if (!user) throw new Error("Unauthorized");
        return await models.Review.find({ sellerId: user.seller });
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
};

export const Mutation = {
  createReview: authenticate(["admin", "customer"])(
    async (_, args, { models, req }) => {
      try {
        let imagesfilepath;
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        if (args.reviewImages) {
          const results = await Promise.all(args.reviewImages.map(processFile));
          const responseData = results.map((result) => ({
            image: result.uniqueFilename,
          }));

          imagesfilepath = responseData.map(
            (data) => process.env.BASE_URL + data.image
          );
        } else {
          imagesfilepath = [];
        }
        const newReview = new models.Review({
          user: user._id,
          productId: args.productId,
          sellerId: args.sellerId,
          orderId: args.orderId,
          images: imagesfilepath,
          rating: args.rating,
          title: args.title,
          description: args.description,
        });
        // send email ---------------------------------------
        const master = await StoreFeature.findOne({});
        const adminemail = await SiteContent.findOne({
          key: "adminEnquiryEmail",
        });
        const product = await Product.findOne(
          { _id: args.productId },
          "identifier"
        );
        const product1 = await Product.findOne(
          { _id: args.productId },
          "variant"
        );
        const variantId = product1.variant[0].location[0].sellerId;
        const seller = await Seller.findOne({ _id: variantId }, "email");
        const prolink = product.identifier.toLowerCase().replace(/ /g, "_");
        const olink = `${process.env.FRONT_URL}/product/${prolink}`;
        const products = await Product.findOne(
          { _id: args.productId },
          "fullName"
        );
        const productfullname = products ? products.fullName : "";
        const params = {
          $firstname: user.firstName,
          $lastname: user.lastName,
          $mobile: user.mobileNo,
          $email: user.email,
          $website: master.storeName,
          $productlink: olink,
          $reviewtitle: args.title,
          $reviewdescription: args.description,
          $rating: args.rating,
          $productname: productfullname,
        };
        const emaildatasubject = await SiteContent.findOne({
          key: "reviewsubject",
        });
        const emaildata = await SiteContent.findOne({
          key: "review",
        });
        const inputString = emaildata.content;
        const inputStringsubject = emaildatasubject.content;
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
          to: user.email,
          cc: [adminemail.content, seller.email],
          subject: modifiedsubject,
          html: modifiedString.replace(/<br>/g, ""),
        };
        await transporter.sendMail(mailOptions);
        // end mail -------------------------------------

        return await newReview.save();
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateReviewReply: authenticate(["admin", "seller"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const review = await models.Review.findById(args.id);
        if (!review) {
          throw new Error("Review not found");
        }

        const now = new Date();
        const day = now.toLocaleString("en-GB", {
          day: "2-digit",
          timeZone: "Asia/Kolkata",
        });
        const month = now.toLocaleString("en-GB", {
          month: "short",
          timeZone: "Asia/Kolkata",
        });
        const year = now.toLocaleString("en-GB", {
          year: "numeric",
          timeZone: "Asia/Kolkata",
        });
        const time = now.toLocaleString("en-GB", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
        });

        const formattedDate = `${day}-${month}-${year} ${time}`;

        const roles = Array.isArray(user.role)
          ? user.role.map((r) => r.toLowerCase())
          : [user.role.toLowerCase()];

        if (roles.includes("seller")) {
          if (args.repliesSeller && args.repliesSeller.trim() !== "") {
            review.repliesSeller = args.repliesSeller;
            review.repliesSellerDate = formattedDate;
          }
        }

        if (roles.includes("admin")) {
          if (args.repliesAdmin && args.repliesAdmin.trim() !== "") {
            review.repliesAdmin = args.repliesAdmin;
            review.repliesAdminDate = formattedDate;
          }
        }

        const updatedReview = await review.save();
        return updatedReview;
      } catch (error) {
        throw new Error(error.message);
      }
    }
  ),
  deleteReview: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      // await deleteChildren(id);
      const deletedReview = await models.Review.findByIdAndRemove(id);
      return deletedReview;
    } catch (error) {
      throw new Error(error);
    }
  }),
};

export const Review = {
  user: async (review, _, { models }) => {
    try {
      return await models.User.findById(review.user);
    } catch (error) {
      throw new Error(error);
    }
  },
};
