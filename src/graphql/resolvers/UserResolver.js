// src/graphql/resolvers/UserResolver.js

import { processFile } from "../../services/fileUploadService.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import doubletick from "@api/doubletick";
import authenticate from "../../middlewares/auth.js";
import nodemailer from "nodemailer";
import axios from "axios";

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "5m";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const refreshTokenSecret =
  process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const signAccessToken = (userId) =>
  jwt.sign({ _id: userId }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });

const signRefreshToken = (userId) =>
  jwt.sign({ _id: userId, type: "refresh" }, refreshTokenSecret, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });

const persistRefreshToken = async (user, refreshToken) => {
  user.refreshTokenHash = hashToken(refreshToken);
  user.refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await user.save();
};

const buildAuthPayload = async (user) => {
  const token = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  await persistRefreshToken(user, refreshToken);
  return { token, refreshToken, user };
};

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
  getUser: authenticate(["admin", "customer"])(
    async (_, { id }, { models }) => {
      try {
        return await models.User.findById(id);
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  verifyAccessToken: async (_, { token }, { req }) => {
    try {
      const authToken =
        token || req.headers.authorization?.split(" ")[1] || null;
      if (!authToken) {
        return false;
      }
      jwt.verify(authToken, process.env.JWT_SECRET);
      return true;
    } catch (error) {
      return false;
    }
  },
  getProfile: authenticate(["admin", "customer"])(
    async (_, __, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return await models.User.findById(decoded._id);
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  getSuperSeller: authenticate(["admin", "superSeller"])(
    async (_, __, { models }) => {
      try {
        return await models.User.find({
          role: "superSeller",
        });
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  getUsers: authenticate(["masterAdmin", "admin"])(
    async (_, { search, limit, offset, sortBy, sortOrder }, { models }) => {
      try {
        const query = {};
        if (search) {
          const searchRegex = new RegExp(search, "i");
          query.$or = [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { email: searchRegex },
            { mobileNo: searchRegex },
            { role: { $elemMatch: { $regex: searchRegex } } },
            {
              $expr: {
                $regexMatch: {
                  input: { $concat: ["$firstName", " ", "$lastName"] },
                  regex: searchRegex,
                },
              },
            },
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
        return await models.User.find(query)
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
  registerUser: async (
    _,
    { firstName, lastName, email, mobileNo, password },
    { models }
  ) => {
    try {
      const master = await models.StoreFeature.findOne({});
      const existingUser = await models.User.findOne({ email });
      const existingUserbymobile = await models.User.findOne({
        mobileNo: mobileNo,
      });

      if (existingUser) {
        throw new Error("Email already registered. Use a different email.");
      }
      if (existingUserbymobile) {
        throw new Error(
          "Mobile number already registered. Use a different number."
        );
      }
      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = new models.User({
        firstName,
        lastName,
        email,
        mobileNo,
        password: hashedPassword,
      });
      await newUser.save();
      /**
      // Email Start  ...................................................
      {
        const emaildata = await models.SiteContent.findOne({
          key: "customerRegistration",
        });
        const emailsubject = await models.SiteContent.findOne({
          key: "customerRegistrationsubject",
        });
        const inputString = emaildata.content;
        const inputStringsubject = emailsubject.content;
        const params = {
          $firstname: newUser.firstName,
          $lastname: newUser.lastName,
          $mobile: newUser.mobileNo,
          $email: newUser.email,
          $website: master.storeName,
        };
        const subject = inputStringsubject;
        const modifiedsubject = subject.replace(
          /\$\w+/g,
          (match) => params[match] || match
        );
        const stringWithoutBr = inputString.replace(
          /\$\w+/g,
          (match) => params[match] || match
        );
        const modifiedString = stringWithoutBr.replace(/<br>/g, "");
        const mailOptions = {
          from: process.env.SMTP_USER,
          to: newUser.email,
          subject: modifiedsubject,
          html: modifiedString.replace(/<br>/g, ""),
        };
        await transporter.sendMail(mailOptions);
      }
      // End Email ---------------------------------

      // SMS Start  ...................................................
      {
        const sms = await models.SiteContent.findOne({
          key: "customerRegistrationsms",
        });
        const paramss = {
          $firstname: newUser.firstName,
          $mobile: newUser.mobileNo,
          $email: newUser.email,
        };
        const smsmessage = sms.content.split("#")[0];
        const sender_id = sms.content.split("#")[1];
        const temp_id = sms.content.split("#")[2];
        const apiUrl = "http://sms.bulkssms.com/submitsms.jsp";
        const user = "AGBCIN";
        const key = "87145d14eeXX";
        const mobile = `+91${newUser.mobileNo}`;
        const message = smsmessage.replace(
          /\$\w+/g,
          (match) => paramss[match] || match
        );
        const senderid = sender_id;
        const accusage = "1";
        const entityid = "1501578910000051328";
        const tempid = temp_id;
        const param = new URLSearchParams({
          user,
          key,
          mobile,
          message,
          senderid,
          accusage,
          entityid,
          tempid,
        });
        axios
          .get(apiUrl, { params: param })
          .then((response) => {
            console.log("API Response:", response.data);
          })
          .catch((error) => {
            console.error("Error:", error);
          });
      }
      // SMS End  ...................................................

      // Whatsapp Start ..................................................
      {
        const whatsappmessage = await models.SiteContent.findOne({
          key: "customerRegistrationWhatsappapi",
        });
        doubletick.auth(process.env.WHATSAPP_API_KEY);
        doubletick
          .outgoingMessagesWhatsappTemplate({
            messages: [
              {
                content: {
                  language: "en",
                  templateData: {
                    body: {
                      placeholders: [
                        `${newUser.firstName}`,
                        `${master.storeName}`,
                        `${master.storeName}`,
                        `${master.storeName}`,
                      ],
                    },
                  },
                  templateName: `${whatsappmessage.content}`,
                },
                from: `+91${master.whatsappAPINo}`,
                to: `+91${newUser.mobileNo}`,
              },
            ],
          })
          .then(({ data }) => console.log(data))
          .catch((err) => console.error(err));
      }
      // Whatsapp End   ..................................................
      */
      return await buildAuthPayload(newUser);
    } catch (error) {
      throw new Error(error);
    }
  },
  registerUserWithSeller: async (
    _,
    {
      firstName,
      lastName,
      email,
      mobileNo,
      companyName,
      gstin,
      fullAddress,
      city,
      state,
      pincode,
      companyDescription,
      status,
      bastatus,
      dealerstatus,
    },
    { models, req }
  ) => {
    try {
      if (!req.headers.authorization) {
        throw new Error("Authorization header missing");
      }
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const master = await models.StoreFeature.findOne({});
      const users = await models.User.findById(decoded._id);
      const sellerid = await models.Seller.findOne({ user: users.id });
      const registercompanyname = sellerid.companyName;

      if (!decoded || !decoded._id) {
        throw new Error("Invalid or expired token");
      }
      const currentuser = await models.User.findById(decoded._id);
      if (!currentuser) {
        throw new Error("User not found");
      }
      const existingUser = await models.User.findOne({
        $or: [{ email }, { mobileNo }],
      });
      if (existingUser) {
        throw new Error("User with this email or mobile number already exists");
      }
      const password = Array.from(
        { length: 8 },
        () =>
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$&!"[
            Math.floor(Math.random() * 70)
          ]
      ).join("");
      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = new models.User({
        firstName,
        lastName,
        email,
        mobileNo,
        password: hashedPassword,
      });
      await newUser.save();
      const billValue = companyName.substring(0, 4).toUpperCase();
      const seller = new models.Seller({
        user: newUser._id,
        superSellerId: currentuser.seller,
        companyName,
        gstin,
        mobileNo,
        email,
        address: fullAddress,
        fullAddress,
        city,
        state,
        pincode,
        companyDescription,
        status,
        bastatus,
        bill: billValue,
      });
      seller.allotted.push({
        dealerId: seller.id,
        baId: sellerid,
        dastatus: false,
      });

      await seller.save();
      newUser.seller = seller._id;
      newUser.role = ["customer", "subBusiness"];
      await newUser.save();

      // Email Start  ...................................................
      {
        const emaildata = await models.SiteContent.findOne({
          key: "newDealerRegistrationMail",
        });
        const emailsubject = await models.SiteContent.findOne({
          key: "newDealerRegistrationSubject",
        });
        const inputString = emaildata.content;
        const inputStringsubject = emailsubject.content;
        const params = {
          $customerName: `${newUser.firstName} ${newUser.lastName}`,
          $email: seller.email,
          $password: password,
          $mobileNo: seller.mobileNo,
          $baName: registercompanyname,
          $dealerName: seller.companyName,
          $gst: seller.gstin,
          $dealerAddress: `${seller.fullAddress}, ${seller.city}, ${seller.state} - ${seller.pincode}`,
          $dealerDescription: seller.companyDescription,
          $website: master.storeName,
        };
        const subject = inputStringsubject;
        const modifiedsubject = subject.replace(
          /\$\w+/g,
          (match) => params[match] || match
        );
        const stringWithoutBr = inputString.replace(
          /\$\w+/g,
          (match) => params[match] || match
        );
        const modifiedString = stringWithoutBr.replace(/<br>/g, "");
        const mailOptions = {
          from: process.env.SMTP_USER,
          to: seller.email,
          subject: modifiedsubject,
          html: modifiedString.replace(/<br>/g, ""),
        };
        await transporter.sendMail(mailOptions);
      }
      // End Email ---------------------------------

      return seller;
    } catch (error) {
      console.error("Error during user registration:", error);
      throw new Error(error.message || "An error occurred during registration");
    }
  },
  updateUser: authenticate(["admin"])(
    async (
      _,
      { id, firstName, lastName, email, mobileNo, password, role },
      { models }
    ) => {
      try {
        const user = await models.User.findById(id);
        if (!user) {
          throw new Error("User not found");
        }

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (email) user.email = email;
        if (mobileNo) user.mobileNo = mobileNo;
        if (password) {
          const hashedPassword = await bcrypt.hash(password, 12);
          user.password = hashedPassword;
        }
        if (role) user.role = role;

        const updatedUser = await user.save();
        return updatedUser;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  addRoleTouser: authenticate(["admin"])(async (_, args, { models }) => {
    try {
      const user = await models.User.findById(args.userId);
      if (!user) {
        throw new Error("User not found");
      }
      if (args.role == "b2b") {
        throw new Error("you can not add b2b and seller directly");
      }
      if (user.role.includes(args.role)) {
        throw new Error("User is already this role");
      }
      user.role.push(args.role);

      await user.save();

      // ------------------------------------
      // If role is Business Associate (SuperSeller) → update Seller table
      // ------------------------------------
      if (args.role === "superSeller") {
        const seller = await models.Seller.findOne({ user: user._id });
        if (seller) {
          seller.businessAssociate = true;
          await seller.save();
        }
      }

      // ------------------------------------
      // If role is Seller Associate → update Seller table
      // ------------------------------------
      if (args.role === "seller") {
        const seller = await models.Seller.findOne({ user: user._id });
        if (seller) {
          seller.sellerAssociate = true;
          await seller.save();
        }
      }

      // ------------------------------------
      // If role is Service Associate → update Seller table
      // ------------------------------------
      if (args.role === "service") {
        const seller = await models.Seller.findOne({ user: user._id });
        if (seller) {
          seller.serviceAssociate = true;
          await seller.save();
        }
      }

      // ------------------------------------
      // If role is Enquiry Associate → update Seller table
      // ------------------------------------
      if (args.role === "enquiry") {
        const seller = await models.Seller.findOne({ user: user._id });
        if (seller) {
          seller.enquiryAssociate = true;
          await seller.save();
        }
      }

      return user;
    } catch (error) {
      throw new Error(error);
    }
  }),
  removeRole: authenticate(["admin"])(async (_, args, { models }) => {
    try {
      const user = await models.User.findById(args.userId);
      if (!user) {
        throw new Error("User not found");
      }
      if (args.role == "b2b") {
        throw new Error("you can not remove b2b and seller directly");
      }
      if (!user.role.includes(args.role)) {
        throw new Error("User dont have this role");
      }
      const newRole = user.role.filter((item) => item !== args.role);
      user.role = newRole;
      await user.save();

      // ------------------------------------
      // Remove role-related field from Seller table
      // ------------------------------------
      const unsetFields = {};

      if (args.role === "superSeller") {
        unsetFields.businessAssociate = 1;
      }

      if (args.role === "seller") {
        unsetFields.sellerAssociate = 1;
      }

      if (args.role === "service") {
        unsetFields.serviceAssociate = 1;
      }

      if (args.role === "enquiry") {
        unsetFields.enquiryAssociate = 1;
      }

      // Apply unset only if any field is matched
      if (Object.keys(unsetFields).length > 0) {
        await models.Seller.updateOne(
          { user: user._id },
          { $unset: unsetFields }
        );
      }

      return user;
    } catch (error) {
      throw new Error(error);
    }
  }),
  profileedit: authenticate(["customer"])(
    async (
      _,
      { firstName, lastName, email, file, mobileNo },
      { models, req }
    ) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (file) {
          const result = await processFile(file);
          const responseData = {
            filename: result.uniqueFilename,
          };
          const filepath = process.env.BASE_URL + responseData.filename;
          const user = await models.User.findByIdAndUpdate(
            decoded._id,
            { firstName, lastName, email, mobileNo, profilepic: filepath },
            { new: true }
          );
          return user;
        } else {
          const user = await models.User.findByIdAndUpdate(
            decoded._id,
            { firstName, lastName, email, mobileNo },
            { new: true }
          );
          return user;
        }
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  deleteUser: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      const user = await models.User.findById(id);
      if (!user) {
        throw new Error("User not found");
      }
      const result = await models.Seller.findOne({ user: id });
      if (result) {
        await models.Seller.deleteOne({ _id: result.id });
      }
      await models.User.deleteOne({ _id: id });

      return user;
    } catch (error) {
      throw new Error(error);
    }
  }),
  loginUser: async (_, { email, password }, { models }) => {
    try {
      const user = await models.User.findOne({
        $or: [{ email: email }, { mobileNo: email }],
      });
      if (!user) {
        throw new Error("User not found");
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error("Incorrect password");
      }

      return await buildAuthPayload(user);
    } catch (error) {
      throw new Error(error);
    }
  },
  loginWith: async (_, { email, firstName }, { models }) => {
    try {
      const user = await models.User.findOne({
        $or: [{ email: email }, { mobileNo: email }],
      });
      if (!user) {
        const password = "logInWithSocialMedia";
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new models.User({
          firstName,
          email,
          password: hashedPassword,
        });
        await newUser.save();
        return await buildAuthPayload(newUser);
      }

      return await buildAuthPayload(user);
    } catch (error) {
      throw new Error(error);
    }
  },
  getTokens: async (_, { email, password }, { models }) => {
    try {
      const user = await models.User.findOne({
        $or: [{ email: email }, { mobileNo: email }],
      });
      if (!user) {
        throw new Error("User not found");
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error("Incorrect password");
      }

      return await buildAuthPayload(user);
    } catch (error) {
      throw new Error(error);
    }
  },
  refreshAccessToken: async (_, { refreshToken }, { models }) => {
    try {
      if (!refreshToken) {
        throw new Error("Refresh token is missing");
      }

      const decoded = jwt.verify(refreshToken, refreshTokenSecret);
      const user = await models.User.findById(decoded._id);
      if (!user) {
        throw new Error("Logout");
      }

      const tokenHash = hashToken(refreshToken);
      if (!user.refreshTokenHash || user.refreshTokenHash !== tokenHash) {
        throw new Error("Logout");
      }

      if (
        user.refreshTokenExpiresAt &&
        user.refreshTokenExpiresAt.getTime() < Date.now()
      ) {
        throw new Error("Logout");
      }

      return await buildAuthPayload(user);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Logout");
      }
      throw new Error(error.message || "Logout");
    }
  },
  changePassword: authenticate(["admin", "customer"])(
    async (_, { id, oldPassword, newPassword }, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        if (!user) {
          throw new Error("User not found");
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
          throw new Error("Invalid current password");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;

        const updatedUser = await user.save();
        return updatedUser;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  requestPasswordReset: async (_, { email }, { models }) => {
    try {
      const user = await models.User.findOne({ email });
      const master = await models.StoreFeature.findOne({});
      const emaildata = await models.SiteContent.findOne({
        key: "forgotPassword",
      });
      const emailsubject = await models.SiteContent.findOne({
        key: "forgotPasswordsubject",
      });
      if (!user) {
        throw new Error(
          "This Email id is not registered with us. Please Register."
        );
      }

      // Generate a password reset token
      const token = jwt.sign(
        { _id: user._id },
        process.env.RESET_TOKEN_SECRET,
        {
          expiresIn: "1h",
        }
      );

      // Send a password reset email
      const link = `${process.env.FRONT_URL}/reset-password?token=${token}`; //agb
      // const link = `https://sailsalemonline.com/reset-password?token=${token}`; //sail

      const inputString = emaildata.content;
      const inputStringsubject = emailsubject.content;
      const params = {
        $firstname: user.firstName,
        $website: master.storeName,
        $link: link,
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
        to: user.email,
        subject: modifiedsubject,
        html: modifiedString.replace(/<br>/g, ""),
      };
      await transporter.sendMail(mailOptions);

      return true;
    } catch (error) {
      throw new Error(error);
    }
  },
  resetPassword: async (_, { token, newPassword }, { models }) => {
    try {
      const decodedToken = jwt.verify(token, process.env.RESET_TOKEN_SECRET);
      const user = await models.User.findById(decodedToken._id);

      if (!user) {
        throw new Error("User not found");
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      user.password = hashedPassword;

      await user.save();
      // send email
      const master = await models.StoreFeature.findOne({});
      const emaildata = await models.SiteContent.findOne({
        key: "updatePassword",
      });
      const emaildatasubject = await models.SiteContent.findOne({
        key: "updatePasswordsubject",
      });
      const inputString = emaildata.content;
      const inputStringsubject = emaildatasubject.content;
      const params = {
        $firstname: user.firstName,
        $lastname: user.lastName,
        $website: master.storeName,
        $mobile: user.mobileNo,
        $email: user.email,
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
        to: user.email,
        subject: modifiedsubject,
        html: modifiedString.replace(/<br>/g, ""),
      };
      await transporter.sendMail(mailOptions);

      // end mail
      return true;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error(
          "Your reset link has expired. Please request a new one."
        );
      } else {
        throw new Error(error.message || "Something went wrong");
      }
    }
  },
};

export const User = {
  addresses: async (user, _, { models }) => {
    try {
      return await models.Address.find({ user: user.id });
    } catch (error) {
      throw new Error(error);
    }
  },
  seller: async (user, _, { models }) => {
    try {
      return await models.Seller.findById(user.seller);
    } catch (error) {
      throw new Error(error);
    }
  },
};
