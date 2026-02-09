// src/graphql/resolvers/SiteContentResolver.js
import authenticate from "../../middlewares/auth.js";
import jwt from "jsonwebtoken";
import doubletick from "@api/doubletick";
import { model } from "mongoose";
import nodemailer from "nodemailer";

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
  getSiteContent: async (_, { key }, { models }) => {
    try {
      const content = await models.SiteContent.findOne({ key });
      if (content != null) {
        return content;
      }
      return "null";
    } catch (err) {
      throw new Error("Failed to retrieve content.");
    }
  },
};

export const Mutation = {
  updateSiteContent: authenticate(["admin"])(
    async (_, { key, content }, { models }) => {
      try {
        let updatedContent = await models.SiteContent.findOne({ key });

        if (!updatedContent) {
          updatedContent = new models.SiteContent({ key, content });
        } else {
          // Process the content to add style="width:100%" to all <img> tags
          const imgStyleRegex =
            /<img(?![^>]*style=["'][^"']*width:\s*100%;[^"']*["'])/g;
          const styledContent = content.replace(
            imgStyleRegex,
            '<img style="width:100%"'
          );
          updatedContent.content = styledContent;
        }

        const savedContent = await updatedContent.save();
        return savedContent;
      } catch (err) {
        throw new Error("Failed to update content.");
      }
    }
  ),
  subscriptionletteremail: async (_, args, { models }) => {
    try {
      let subemail = await models.SubscriptionLetter.findOne({
        email: args.email,
      });

      if (subemail) {
        return {
          message: "Email is already subscribed",
        };
      } else {
        const emaildata = await models.SiteContent.findOne({
          key: "subscriptionLetter",
        });

        const newSubscriptionLetter = new models.SubscriptionLetter({
          email: args.email,
        });
        const master = await models.StoreFeature.findOne({});
        const adminemail = await models.SiteContent.findOne({
          key: "adminEnquiryEmail",
        });
        await newSubscriptionLetter.save();
        // send email

        const inputString = emaildata.content;
        const params = {
          $email: args.email,
          $website: master.storeName,
        };
        const subject = "Subscription to Newsletter on $website ";
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
          to: args.email,
          cc: [adminemail.content],
          // cc: ['cc1@example.com', 'cc2@example.com'],
          subject: modifiedsubject,
          html: modifiedString.replace(/<br>/g, ""),
          // attachments: [
          //   {
          //     filename: "Seller-Commission-Policy.pdf",
          //     path: "http://localhost:4000/uploads/27044-1738909221517.pdf",
          //   },
          // ],
        };
        const newEnquery = new models.Enquery({
          active: false,
          types: "subscription_letter",
          email: args.email,
        });
        await newEnquery.save();
        await transporter.sendMail(mailOptions);

        return {
          message: "Subscribed Successfully !",
        };
      }
    } catch (error) {
      throw new Error("Failed to update content.");
    }
  },
  contactUsMail: async (_, args, { models }) => {
    try {
      // send email
      const master = await models.StoreFeature.findOne({});
      const emaildata = await models.SiteContent.findOne({
        key: "contactEnquiryPage",
      });
      const emailsubject = await models.SiteContent.findOne({
        key: "contactEnquiryPagesubject",
      });
      const adminemail = await models.SiteContent.findOne({
        key: "adminEnquiryEmail",
      });
      const inputString = emaildata.content;
      const inputsubject = emailsubject.content;
      const params = {
        $firstname: args.name,
        $email: args.email,
        $mobile: args.mobile,
        $address: args.address,
        $state: args.state,
        $message: args.message,
        $website: master.storeName,
      };
      const subject = inputsubject;
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
        to: args.email,
        cc: [adminemail.content],
        subject: modifiedsubject,
        html: modifiedString.replace(/<br>/g, ""),
      };
      await transporter.sendMail(mailOptions);

      const newEnquery = new models.Enquery({
        message: args.message,
        active: false,
        types: "contact_enquiry",
        customerName: args.name,
        email: args.email,
        mobileNo: args.mobile,
        fullAddress: args.address,
        state: args.state,
      });
      await newEnquery.save();

      return {
        message: "Sent Successfully",
      };
    } catch (error) {
      throw new Error("Failed");
    }
  },
  sellerRegMail: async (_, args, { models, req }) => {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await models.User.findById(decoded._id);
      const adminemail = await models.SiteContent.findOne({
        key: "adminEnquiryEmail",
      });
      const master = await models.StoreFeature.findOne({});
      let emaildata, emaildatasubject;
      if (args.type === "enquiry") {
        emaildatasubject = await models.SiteContent.findOne({
          key: "enquiryregistrationsubject",
        });
        emaildata = await models.SiteContent.findOne({
          key: "enquiryRegistrationMail",
        });
      } else if (args.type === "service") {
        emaildatasubject = await models.SiteContent.findOne({
          key: "serviceregistrationsubject",
        });
        emaildata = await models.SiteContent.findOne({
          key: "serviceRegistrationMail",
        });
      } else if (args.type === "trade") {
        emaildatasubject = await models.SiteContent.findOne({
          key: "sellerregistrationsubject",
        });
        emaildata = await models.SiteContent.findOne({
          key: "sellerRegistrationMail",
        });
      } else if (args.type === "business") {
        emaildatasubject = await models.SiteContent.findOne({
          key: "businessregistrationsubject",
        });
        emaildata = await models.SiteContent.findOne({
          key: "businessRegistrationMail",
        });
      } else if (args.type === "dealer") {
        emaildatasubject = await models.SiteContent.findOne({
          key: "businessDealerRegistrationSubject",
        });
        emaildata = await models.SiteContent.findOne({
          key: "businessDealerRegistrationMail",
        });
      } else {
        throw new Error("Invalid type provided");
      }
      const gst_pan = args.gst
        ? `${args.gst} (Composition: ${args.composition ? "Yes" : "No"})`
        : args.pancardNo;
      const params = {
        $customername: `${user.firstName} ${user.lastName}`,
        $customeremail: user.email,
        $customermobile: user.mobileNo,
        $firmname: args.name,
        $firmdescription: args.description,
        $firmemail: args.email,
        $gst_pan: gst_pan,
        $firmmobile: args.mobile,
        $firmaddress: `${args.fulladdress}, ${args.city}, ${args.state} - ${args.pincode} `,
        $website: master.storeName,
        $plan: args.plan,
      };
      const modifiedString = emaildata.content.replace(
        /\$\w+/g,
        (match) => params[match] || match
      );
      const modifiedsubject = emaildatasubject.content.replace(
        /\$\w+/g,
        (match) => params[match] || match
      );
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: args.email,
        cc: [adminemail.content],
        subject: modifiedsubject,
        html: modifiedString.replace(/<br>/g, ""),
      };
      await transporter.sendMail(mailOptions);
      return {
        message: "Sent Successfully",
      };
    } catch (error) {
      throw new Error("Failed");
    }
  },
  bA_n_dA_RegMail: async (_, args, { models, req }) => {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await models.User.findById(decoded._id);
      const master = await models.StoreFeature.findOne({});
      const adminemail = await models.SiteContent.findOne({
        key: "adminEnquiryEmail",
      });
      let emaildata, emaildatasubject;
      if (args.type === "business") {
        emaildatasubject = await models.SiteContent.findOne({
          key: "businessregistrationsubject",
        });
        emaildata = await models.SiteContent.findOne({
          key: "businessRegistrationMail",
        });
      } else if (args.type === "dealer") {
        emaildatasubject = await models.SiteContent.findOne({
          key: "businessDealerRegistrationSubject",
        });
        emaildata = await models.SiteContent.findOne({
          key: "businessDealerRegistrationMail",
        });
      } else {
        throw new Error("Invalid type provided");
      }
      const params = {
        $customername: `${user.firstName} ${user.lastName}`,
        $customeremail: user.email,
        $customermobile: user.mobileNo,
        $firmname: args.name,
        $firmdescription: args.description,
        $firmemail: args.email,
        $gst: args.gst,
        $firmmobile: args.mobile,
        $firmaddress: `${args.fulladdress}, ${args.city}, ${args.state} - ${args.pincode} `,
        $website: master.storeName,
      };
      const modifiedString = emaildata.content.replace(
        /\$\w+/g,
        (match) => params[match] || match
      );
      const modifiedsubject = emaildatasubject.content.replace(
        /\$\w+/g,
        (match) => params[match] || match
      );
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: args.email,
        cc: [adminemail.content],
        subject: modifiedsubject,
        html: modifiedString.replace(/<br>/g, ""),
      };

      await transporter.sendMail(mailOptions);
      return {
        message: "Sent Successfully",
      };
    } catch (error) {
      throw new Error("Failed");
    }
  },

  singleEnquryMail: async (_, args, { models, req }) => {
    try {
      const emaildata = await models.SiteContent.findOne({
        key: "singleEnquiryCustomer",
      });
      const emailsubjectdata = await models.SiteContent.findOne({
        key: "singleEnquirySubjectCustomer",
      });
      const adminemail = await models.SiteContent.findOne({
        key: "adminEnquiryEmail",
      });
      const master = await models.StoreFeature.findOne({});
      const inputString = emaildata.content;
      const inputStringSubject = emailsubjectdata.content;
      const params = {
        $fullname: args.fullname,
        $email: args.email,
        $mobile: args.mobile,
        $address: args.address,
        $state: args.state,
        $message: args.message,
        $productname: args.productname,
        $website: master.storeName,
      };
      const modifiedSubjectString = inputStringSubject.replace(
        /\$\w+/g,
        (match) => params[match] || match
      );
      const modifiedString = inputString.replace(
        /\$\w+/g,
        (match) => params[match] || match
      );
      const subject = modifiedSubjectString;
      const modifiedsubject = subject.replace(
        /\$\w+/g,
        (match) => params[match] || match
      );

      const product = await models.Product.findOne({
        fullName: args.productname,
      });
      const sellerId = product.variant[0].location[0].sellerId;
      const seller = await models.Seller.findOne({ _id: sellerId });
      let ccEmails = [adminemail.content];
      if (seller?.emailPermission) {
        ccEmails.push(seller.email);
      }
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: args.email,
        cc: ccEmails,
        subject: modifiedsubject,
        html: modifiedString.replace(/<br>/g, ""),
      };

      const newEnquery = new models.Enquery({
        message: args.message,
        active: false,
        types: "single_enquiry_product",
        customerName: args.fullname,
        email: args.email,
        mobileNo: args.mobile,
        fullAddress: args.address,
        state: args.state,
        productName: args.productname,
        sellerId: seller._id,
      });
      await newEnquery.save();

      await transporter.sendMail(mailOptions);
      return {
        message: "Sent Successfully",
      };
    } catch (error) {
      throw new Error("Failed");
    }
  },
  bulkEnquryMail: async (_, args, { models, req }) => {
    try {
      // const token = req.headers.authorization.split(" ")[1];
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // const user = await models.User.findById(decoded._id);
      const emaildata = await models.SiteContent.findOne({
        key: "bulkEnquiryCustomer",
      });
      const emailsubjectdata = await models.SiteContent.findOne({
        key: "bulkEnquirySubjectCustomer",
      });
      const adminemail = await models.SiteContent.findOne({
        key: "adminEnquiryEmail",
      });
      const master = await models.StoreFeature.findOne({});
      // send email

      const inputString = emaildata.content;
      const inputStringSubject = emailsubjectdata.content;
      const params = {
        $fullname: args.fullname,
        $email: args.email,
        $mobile: args.mobile,
        $address: args.address,
        $state: args.state,
        $message: args.message,
        $productname: args.productname,
        $website: master.storeName,
      };
      const modifiedSubjectString = inputStringSubject.replace(
        /\$\w+/g,
        (match) => params[match] || match
      );
      const modifiedString = inputString.replace(
        /\$\w+/g,
        (match) => params[match] || match
      );
      const subject = modifiedSubjectString;
      const modifiedsubject = subject.replace(
        /\$\w+/g,
        (match) => params[match] || match
      );
      const product = await models.Product.findOne({
        fullName: args.productname,
      });
      const sellerId = product.variant[0].location[0].sellerId;
      const seller = await models.Seller.findOne({ _id: sellerId });
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: args.email,
        cc: [adminemail.content],
        subject: modifiedsubject,
        html: modifiedString.replace(/<br>/g, ""),
      };

      const newEnquery = new models.Enquery({
        message: args.message,
        active: false,
        types: "bulk_enquiry_product",
        customerName: args.fullname,
        email: args.email,
        mobileNo: args.mobile,
        fullAddress: args.address,
        state: args.state,
        productName: args.productname,
        sellerId: seller._id,
      });
      await newEnquery.save();

      await transporter.sendMail(mailOptions);

      // end mail

      return {
        message: "Sent Successfully",
      };
    } catch (error) {
      throw new Error("Failed");
    }
  },
  cartEnquryMail: async (_, args, { models, req }) => {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await models.User.findById(decoded._id);
      const cart = await models.Cart.findOne({ userId: user.id });

      const productIds = cart.cartProducts.map((product) => product.productId);
      const uniqueProductIds = [...new Set(productIds)];
      const products = await models.Product.find(
        { _id: { $in: uniqueProductIds } },
        "fullName"
      ).lean();

      const productMap = products.reduce((map, product) => {
        map[product._id.toString()] = product.fullName;
        return map;
      }, {});

      const enrichedCartProducts = cart.cartProducts.map((product) => ({
        ...product,
        productName:
          productMap[product.productId.toString()] || "Unknown Product",
      }));

      const formatCartProducts = (cartProducts) => {
        return cartProducts
          .map(
            (product) => `
    Product Name: ${product.productName}
  `
          )
          .join("<br />");
      };

      const formattedCartProducts = formatCartProducts(enrichedCartProducts);

      const emaildata = await models.SiteContent.findOne({
        key: "shoppingCartEnquiryPage",
      });
      const emailsubjectdata = await models.SiteContent.findOne({
        key: "shoppingCartSubjectEnquiryPage",
      });
      const adminemail = await models.SiteContent.findOne({
        key: "adminEnquiryEmail",
      });
      const master = await models.StoreFeature.findOne({});

      const inputString = emaildata.content;
      const inputStringSubject = emailsubjectdata.content;
      const params = {
        $firstname: user.firstName,
        $lastname: user.lastName,
        $email: user.email,
        $mobile: user.mobileNo,
        $message: args.message,
        $cartDetails: formattedCartProducts,
        $website: master.storeName,
      };

      const modifiedSubjectString = inputStringSubject.replace(
        /\$\w+/g,
        (match) => params[match] || match
      );
      const modifiedString = inputString.replace(
        /\$\w+/g,
        (match) => params[match] || match
      );
      const subject = modifiedSubjectString;
      const modifiedsubject = subject.replace(
        /\$\w+/g,
        (match) => params[match] || match
      );
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: user.email,
        cc: [adminemail.content],
        subject: modifiedsubject,
        html: modifiedString.replace(/<br>/g, ""),
      };

      const newEnquery = new models.Enquery({
        message: args.message,
        active: false,
        types: "cart_enquiry_product",
        customerName: user.firstName,
        email: user.email,
        mobileNo: user.mobileNo,
        productName: formattedCartProducts,
      });
      await newEnquery.save();

      await transporter.sendMail(mailOptions);

      return {
        message: "Sent Successfully",
      };
    } catch (error) {
      throw new Error("Failed");
    }
  },
  whatsAppEnquryMail: async (_, args, { models }) => {
    try {
      const newEnquiry = new models.Enquery({
        active: false,
        types: "whatsappenquiry",
        mobile: args.mobile,
        productname: args.productname,
      });
      await newEnquiry.save();
      return {
        message: "Sent Successfully!",
      };
    } catch (error) {
      throw new Error("Failed");
    }
  },
};
