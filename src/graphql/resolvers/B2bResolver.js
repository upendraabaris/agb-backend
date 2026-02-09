// src/graphql/resolvers/SellerResolver.js
import authenticate from "../../middlewares/auth.js";
import jwt from "jsonwebtoken";
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
  getB2b: authenticate(["admin", "b2b"])(async (_, { id }, { models }) => {
    try {
      return await models.B2b.findById(id);
    } catch (error) {
      throw new Error(error);
    }
  }),
  getAllB2b: authenticate(["admin"])(
    async (_, { search, limit, offset, sortBy, sortOrder }, { models }) => {
      try {
        const query = {};

        if (search) {
          // Use a case-insensitive regular expression to search for users
          const searchRegex = new RegExp(search, "i");
          query.$or = [
            { companyName: searchRegex },
            { gstin: searchRegex },
            { mobileNo: searchRegex },
            { email: searchRegex },
            { status: searchRegex },
          ];
        }

        const sortOptions = {};

        // Check if a sort field is provided
        if (sortBy) {
          // Use a case-insensitive regular expression for sorting
          // const sortField = sortBy;
          sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
        }

        const collationOptions = {
          locale: "en",
          strength: 2,
        };
        return await models.B2b.find(query)
          .collation(collationOptions)
          .sort(sortOptions)
          .limit(limit)
          .skip(offset);
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
};

export const Mutation = {
  upgradeUserToB2b: authenticate(["admin", "customer"])(
    async (
      _,
      { companyName, gstin, address, companyDescription, mobileNo, email },
      { models, req }
    ) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        if (!user) {
          throw new Error("User not found");
        }

        if (user.role.includes("b2b")) {
          throw new Error("User is already a b2b");
        }

        const b2b = new models.B2b({
          user: decoded._id,
          companyName,
          gstin,
          address,
          companyDescription,
          mobileNo,
          email,
          status: "Pending",
        });

        const savedB2b = await b2b.save(); 
        
        // send email
        // {
        //   const master = await models.StoreFeature.findOne({});
        //   const emaildata = await models.SiteContent.findOne({
        //     key: "b2bRegistration",
        //   });
        //   const adminemail = await models.SiteContent.findOne({
        //     key: "adminEnquiryEmail",
        //   });
        //   const inputString = emaildata.content;
        //   const params = {
        //     $firstname: user.firstName,
        //     $lastname: user.lastName,
        //     $name: companyName,
        //     $gst: gstin,
        //     $mobile: mobileNo,
        //     $description: companyDescription,
        //     $email: email,
        //     $address: address,
        //     $website: master.storeName,
        //   };
        //   const subject = "B2B Registration Success on $website";
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
        //     to: email,
        //     cc: [adminemail.content],
        //     subject: modifiedsubject,
        //     html: modifiedString.replace(/<br>/g, ""),
        //   };
        //   await transporter.sendMail(mailOptions);
        // }
        // end mail

        return savedB2b;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  // ...updateSeller and deleteSeller
  updateB2b: authenticate(["admin"])(
    async (
      _,
      {
        id,
        companyName,
        gstin,
        address,
        companyDescription,
        mobileNo,
        email,
        status,
      },
      { models }
    ) => {
      try {
        const b2b = await models.B2b.findById(id);
        const user = await models.User.findById(b2b.user);
        if (!b2b) {
          throw new Error("B2b not found");
        }

        if (companyName) {
          b2b.companyName = companyName;
        }
        if (gstin) {
          b2b.gstin = gstin;
        }
        if (address) {
          b2b.address = address;
        }
        if (companyDescription) {
          b2b.companyDescription = companyDescription;
        }
        if (mobileNo) {
          b2b.mobileNo = mobileNo;
        }
        if (email) {
          b2b.email = email;
        }
        if (status) {
          b2b.status = status;
        }

        if ((status = "Approved")) {
          user.role.push("b2b");
          user.b2b = b2b.id;
          await user.save();
          // send email
          const master = await models.StoreFeature.findOne({});
          const emaildata = await models.SiteContent.findOne({
            key: "b2bRequestApprove",
          });
          const adminemail = await models.SiteContent.findOne({
            key: "adminEnquiryEmail",
          });
          const inputString = emaildata.content;
          const params = {
            $firstname: user.firstName,
            $lastname: user.lastName,
            $name: companyName,
            $gst: gstin,
            $mobile: mobileNo,
            $description: companyDescription,
            $email: email,
            $address: address,
            $website: master.storeName,
          };
          const subject = "B2B Registration Success on $website";
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
            to: email,
            cc: [adminemail.content],
            subject: modifiedsubject,
            html: modifiedString.replace(/<br>/g, ""),
          };
          await transporter.sendMail(mailOptions);

          // end mail
        } else {
          // send email
          const master = await models.StoreFeature.findOne({});
          const emaildata = await models.SiteContent.findOne({
            key: "b2bRequestReject",
          });
          const adminemail = await models.SiteContent.findOne({
            key: "adminEnquiryEmail",
          });
          const inputString = emaildata.content;
          const params = {
            $firstname: user.firstName,
            $lastname: user.lastName,
            $name: companyName,
            $gst: gstin,
            $mobile: mobileNo,
            $description: companyDescription,
            $email: email,
            $address: address,
            $website: master.storeName,
          };
          const subject = "B2B Registration Failure on $website";
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
            to: email,
            cc: [adminemail.content],
            subject: modifiedsubject,
            html: modifiedString.replace(/<br>/g, ""),
          };
          await transporter.sendMail(mailOptions);

          // end mail
        }

        const updatedB2b = await b2b.save();
        return updatedB2b;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  deleteB2b: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      const b2b = await models.B2b.findById(id);
      if (!b2b) {
        throw new Error("Seller not found");
      }

      const user = await models.User.findById(b2b.user);
      user.role = user.role.filter((role) => role !== "b2b");
      user.b2b = undefined;
      await user.save();

      const deletedB2b = await models.B2b.findByIdAndRemove(id);
      return deletedB2b;
    } catch (error) {
      throw new Error(error);
    }
  }),
};

export const B2b = {};
