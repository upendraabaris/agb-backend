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
  getSeller: async (_, { id }, { models }) => {
    try {
      const seller = await models.Seller.findById(id);
      return await models.Seller.findById(id);
    } catch (error) {
      throw new Error(error);
    }
  },
  getSuperSellerProductForSeller: authenticate([
    "admin",
    "superSeller",
    "subBusiness",
  ])(async (_, __, { models, req }) => {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentSeller = await models.Seller.findOne({
        user: decoded._id,
      });
      const products = [];
      for (const data of currentSeller.superSellerId) {
        const superProduct = await models.SuperSellerProduct.find({
          superSellerId: data,
          approve: true,
        });
        products.push(...superProduct);
      }
      return products;
    } catch (error) {
      throw new Error(error);
    }
  }),
  getAllSellerForSuperSeller: authenticate(["admin", "superSeller"])(
    async (_, __, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);

        const seller = await models.Seller.find({
          allotted: {
            $elemMatch: {
              baId: user.seller,
            },
          },
        });
        return seller;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  getSellerPermission: authenticate(["admin", "seller", "subBusiness"])(
    async (_, { id }, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentSeller = await models.Seller.findOne({
          user: decoded._id,
        });

        if (!currentSeller) {
          throw new Error("Seller not found");
        }

        return currentSeller;
      } catch (error) {
        console.error("Error in getSellerPermission:", error);
        throw new Error("Unauthorized access or invalid token");
      }
    }
  ),
  getAllSellers: authenticate(["admin", "accounts"])(
    async (_, { search, limit, offset, sortBy, sortOrder }, { models }) => {
      try {
        const query = { status: true };

        if (search) {
          const searchRegex = new RegExp(search, "i");
          query.$or = [
            { companyName: searchRegex },
            { gstin: searchRegex },
            { pancardNo: searchRegex },
            { email: searchRegex },
            { companyDescription: searchRegex },
            { mobileNo: searchRegex },
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

        return await models.Seller.find(query)
          .collation(collationOptions)
          .sort(sortOptions)
          .limit(limit)
          .skip(offset);
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  getAllSuperSellers: authenticate(["admin"])(
    async (_, { search, limit, offset, sortBy, sortOrder }, { models }) => {
      try {
        const usersWithBusinessRole = await models.User.find({
          role: "superSeller",
        });
        const businessUserIds = usersWithBusinessRole.map(
          (user) => user.seller
        );

        const query = {
          businessAssociate: true,
          _id: { $in: businessUserIds },
        };
        if (search) {
          const searchRegex = new RegExp(search, "i");
          query.$or = [
            { companyName: searchRegex },
            { gstin: searchRegex },
            { email: searchRegex },
            { mobileNo: searchRegex },
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

        return await models.Seller.find(query)
          .collation(collationOptions)
          .sort(sortOptions)
          .limit(limit)
          .skip(offset);
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  getBAallDa: authenticate(["admin"])(async (_, { baID }, { models }) => {
    try {
      const sellers = await models.Seller.find({
        allotted: { $elemMatch: { baId: baID } },
      });

      return sellers;
    } catch (error) {
      throw new Error(error);
    }
  }),
  getAllEnquiry: authenticate(["admin"])(
    async (_, { search, limit, offset, sortBy, sortOrder }, { models }) => {
      try {
        // Step 1: Get users with the "enquiry" role
        const usersWithBusinessRole = await models.User.find({
          role: "enquiry",
        });
        const businessUserIds = usersWithBusinessRole.map(
          (user) => user.seller
        );

        // Step 2: Prepare the query for the Seller table
        const query = {
          enquiryAssociate: true,
          _id: { $in: businessUserIds }, // Match sellers with the retrieved user IDs
        };

        // Step 3: Add search functionality if provided
        if (search) {
          const searchRegex = new RegExp(search, "i");
          query.$or = [
            { companyName: searchRegex },
            { gstin: searchRegex },
            { email: searchRegex },
            { mobileNo: searchRegex },
          ];
        }

        // Step 4: Prepare sorting options
        const sortOptions = {};
        if (sortBy) {
          sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
        }

        const collationOptions = {
          locale: "en",
          strength: 2,
        };

        // Step 5: Fetch data from the Seller table
        return await models.Seller.find(query)
          .collation(collationOptions)
          .sort(sortOptions)
          .limit(limit)
          .skip(offset);
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  getAllSellersByExactMatch: authenticate(["admin", "superSeller"])(
    async (_, { search, limit, offset, sortBy, sortOrder }, { models }) => {
      try {
        const query = {};

        if (search) {
          query.$or = [
            { email: search },
            { mobileNo: search },
            { gstin: search },
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

        return await models.Seller.find(query)
          .collation(collationOptions)
          .sort(sortOptions)
          .limit(limit)
          .skip(offset);
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  getDeliveredOrderSummary: authenticate(["admin", "seller"])(
    async (_, __, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentSeller = await models.Seller.findOne({
          user: decoded._id,
        });

        if (!currentSeller) {
          throw new Error("Seller not found");
        }

        const result = await models.Order.aggregate([
          {
            $match: {
              "orderProducts.sellerId": currentSeller._id,
              paymentStatus: "complete",
            },
          },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$totalAmount" },
              count: { $sum: 1 },
            },
          },
        ]);
        return {
          count: result.length > 0 ? result[0].count : 0,
          totalAmount: result.length > 0 ? result[0].totalAmount : 0,
        };
      } catch (error) {
        console.error("Error in getDeliveredOrderSummary:", error);
        throw new Error("Unable to fetch delivered order summary");
      }
    }
  ),
};

export const Mutation = {
  upgradeUserToSeller: authenticate(["admin"])(
    async (
      _,
      {
        userId,
        companyName,
        bill,
        gstin,
        gstinComposition,
        pancardNo,
        fullAddress,
        city,
        state,
        pincode,
        companyDescription,
        mobileNo,
        email,
        enquiryAssociate,
        businessAssociate,
        serviceAssociate,
        sellerAssociate,
        emailPermission,
        whatsAppPermission,
        whatsAppMobileNo,
        status,
        bastatus,
      },
      { models }
    ) => {
      try {
        const user = await models.User.findById(userId);
        if (!user) {
          throw new Error("User not found");
        }
        if (user.role.includes("seller")) {
          throw new Error("User is already a seller");
        }

        // ----------------------------------------------------
        // Create new seller data
        // ----------------------------------------------------
        const seller = new models.Seller({
          user: userId,
          companyName,
          bill,
          gstin,
          gstinComposition,
          pancardNo,
          fullAddress,
          city,
          state,
          pincode,
          companyDescription,
          mobileNo,
          email,
          status,
        });
        if (enquiryAssociate) {
          seller.enquiryAssociate = true;
          user.role.push("enquiry");
          await user.save();
        }
        if (businessAssociate) {
          seller.businessAssociate = true;
          user.role.push("superSeller");
          await user.save();
        }
        if (serviceAssociate) {
          seller.serviceAssociate = true;
          user.role.push("service");
          await user.save();
        }
        if (sellerAssociate) {
          seller.sellerAssociate = true;
          user.role.push("seller");
          await user.save();
        }
        if (whatsAppPermission) {
          seller.whatsAppPermission = true;
        }
        if (emailPermission) {
          seller.emailPermission = true;
        }
        if (whatsAppMobileNo) {
          seller.whatsAppMobileNo = whatsAppMobileNo;
        }
        if (bastatus) {
          seller.bastatus = true;
        }
        const savedSeller = await seller.save();

        user.seller = savedSeller.id;
        await user.save();

        // Email Send --------------------------------------------------------------------
        {
          let bodyKey = "";
          let subjectKey = "";

          if (sellerAssociate === true) {
            bodyKey = "sellerRequestApprove";
            subjectKey = "sellerrequestapprovesubject";
          } else if (businessAssociate === true) {
            bodyKey = "businessRequestApprove";
            subjectKey = "businessrequestapprovesubject";
          } else {
            return;
          }

          const [master, emailBody, emailSubject, adminEmail] =
            await Promise.all([
              models.StoreFeature.findOne({}),
              models.SiteContent.findOne({ key: bodyKey }),
              models.SiteContent.findOne({ key: subjectKey }),
              models.SiteContent.findOne({ key: "adminEnquiryEmail" }),
            ]);

          const gst_pan = gstin
            ? `${gstin} (Composition: ${gstinComposition ? "true" : "false"})`
            : pancardNo;

          const params = {
            $firstname: user.firstName,
            $lastname: user.lastName,
            $mobile: user.mobileNo,
            $email: user.email,
            $firmname: companyName,
            $gst_pan: gst_pan,
            $firmaddress: fullAddress,
            $firmcity: city,
            $firmstate: state,
            $firmpincode: pincode,
            $firmdescription: companyDescription,
            $firmmobileNo: mobileNo,
            $firmemail: email,
            $website: master?.storeName || "",
          };

          const replaceParams = (text = "") =>
            text.replace(/\$\w+/g, (match) => params[match] || match);

          const finalSubject = replaceParams(emailSubject?.content);
          const finalBody = replaceParams(emailBody?.content).replace(
            /<br>/g,
            ""
          );

          await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            cc: adminEmail?.content ? [adminEmail.content] : [],
            subject: finalSubject,
            html: finalBody,
          });
        }
        // Emmail End --------------------------------------------------------------------

        return savedSeller;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateSeller: authenticate([
    "admin",
    "seller",
    "superSeller",
    "subBusiness",
    "accounts",
    "enquiry",
    "b2b",
    "service",
  ])(
    async (
      _,
      {
        id,
        companyName,
        gstin,
        address,
        fullAddress,
        city,
        state,
        pincode,
        companyDescription,
        mobileNo,
        email,
        enquiryAssociate,
        businessAssociate,
        serviceAssociate,
        sellerAssociate,
        emailPermission,
        whatsAppPermission,
        whatsAppMobileNo,
        bill,
        status,
        bastatus,
        accountHolderName,
        accountNumber,
        ifscCode,
        bankName,
        branchName,
        upiId,
        sellerMasking,
      },
      { models }
    ) => {
      try {
        const seller = await models.Seller.findById(id);
        if (!seller) {
          throw new Error("Seller not found");
        }
        if (companyName) {
          seller.companyName = companyName;
        }
        if (gstin) {
          seller.gstin = gstin;
        }
        if (address) {
          const parts = address.split(",");
          const combineaddress = {
            address: parts[0],
            address2: parts[1] || "",
            city: parts[2] || "",
            pincode: parts[3] || "",
            state: parts[4] || "",
          };

          seller.address = JSON.stringify(combineaddress);
        }
        if (fullAddress) {
          seller.fullAddress = fullAddress;
        }
        if (city) {
          seller.city = city;
        }
        if (state) {
          seller.state = state;
        }
        if (pincode) {
          seller.pincode = pincode;
        }
        if (companyDescription) {
          seller.companyDescription = companyDescription;
        }
        if (mobileNo) {
          seller.mobileNo = mobileNo;
        }
        if (email) {
          seller.email = email;
        }
        if (enquiryAssociate) {
          seller.enquiryAssociate = enquiryAssociate;
        }
        if (emailPermission) {
          seller.emailPermission = emailPermission;
        }
        if (whatsAppPermission) {
          seller.whatsAppPermission = whatsAppPermission;
        }
        if (whatsAppMobileNo) {
          seller.whatsAppMobileNo = whatsAppMobileNo;
        }
        if (bill) {
          seller.bill = bill;
        }
        if (accountHolderName) seller.accountHolderName = accountHolderName;
        if (accountNumber) seller.accountNumber = accountNumber;
        if (ifscCode) seller.ifscCode = ifscCode;
        if (bankName) seller.bankName = bankName;
        if (branchName) seller.branchName = branchName;
        if (upiId) seller.upiId = upiId;
        seller.sellerMasking = sellerMasking;
        const updatedSeller = await seller.save();
        return updatedSeller;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateSellerReview: authenticate(["customer"])(
    async (_, { id, description, rating }, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const seller = await models.Seller.findById(id);
        if (!seller) {
          throw new Error("Seller not found");
        }
        if (!seller.review) {
          seller.review = [];
        }
        const parsedRating = parseFloat(rating);
        if (isNaN(parsedRating) || parsedRating < 0) {
          throw new Error("Invalid rating value");
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

        const newReview = {
          description,
          userRating: parsedRating,
          ratingDate: formattedDate,
          customerName: `${user.firstName} ${user.lastName}`,
          user: user._id,
        };
        seller.review.push(newReview);
        const totalReviews = seller.review.length;
        const oldRating = seller.overallrating || 0;
        const oldCount = totalReviews - 1;
        const newOverallRating =
          oldCount > 0
            ? (oldRating * oldCount + parsedRating) / totalReviews
            : parsedRating;
        seller.overallrating = parseFloat(newOverallRating.toFixed(2));
        const updatedSeller = await seller.save();
        return updatedSeller;
      } catch (error) {
        throw new Error(error.message);
      }
    }
  ),
  updateDealerPincode: authenticate(["admin", "superSeller"])(
    async (_, { id, dealerId, baId, pincode, state }, { models }) => {
      try {
        const seller = await models.Seller.findById(id);
        if (!seller) {
          throw new Error("Seller not found");
        }
        if (!Array.isArray(seller.allotted)) {
          seller.allotted = [];
        }
        const existingEntry = seller.allotted.find(
          (entry) => entry.dealerId.toString() === dealerId
        );
        if (existingEntry) {
          existingEntry.pincode = pincode || [];
          existingEntry.state = state || [];
          existingEntry.baId = baId || existingEntry.baId;
        } else {
          seller.allotted.push({
            dealerId,
            baId,
            pincode: pincode || [],
            state: state || [],
          });
        }
        return await seller.save();
      } catch (error) {
        throw new Error(error.message);
      }
    }
  ),
  addSellerReply: authenticate(["seller", "admin"])(
    async (
      _,
      { reviewId, sellerId, sellerReply, adminReply },
      { models, req }
    ) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);

        const hasAccess =
          user.role?.includes("seller") || user.role?.includes("admin");

        if (!hasAccess) {
          throw new Error("Access denied. Only seller or admin allowed.");
        }

        // yaha se aage seller table ka use karna hai
        const seller = await models.Seller.findById(sellerId);
        if (!seller) throw new Error("Seller not found");

        if (!Array.isArray(seller.review) || seller.review.length === 0) {
          throw new Error("Seller has no reviews");
        }

        const reviewItem = seller.review.find(
          (item) => item._id?.toString() === reviewId.toString()
        );

        if (!reviewItem) throw new Error("Review not found in seller");

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
        if (sellerReply && sellerReply.trim() !== "") {
          reviewItem.sellerReply = sellerReply;
          reviewItem.sellerReplyDate = formattedDate;
        }

        if (adminReply && adminReply.trim() !== "") {
          reviewItem.adminReply = adminReply;
          reviewItem.adminReplyDate = formattedDate;
        }

        const updatedSeller = await seller.save();

        return updatedSeller;
      } catch (error) {
        throw new Error(error.message || "Failed to add reply");
      }
    }
  ),
  approveSuperSeller: authenticate(["admin", "superSeller"])(
    async (_, { sellerid, superSellerID }, { models }) => {
      try {
        const seller = await models.Seller.findById(sellerid);
        if (!seller) {
          throw new Error("Seller not found");
        }
        const superSeller = await models.User.findById(superSellerID);

        if (!superSeller) {
          throw new Error("Super Seller not found");
        }

        if (!Array.isArray(seller.superSellerId)) {
          seller.superSellerId = [];
        }
        if (!seller.superSellerId.includes(superSeller.seller)) {
          seller.superSellerId = [...seller.superSellerId, superSeller.seller];
        }
        const user = await models.User.findById(seller.user);

        if (!user.role.includes("subBusiness")) {
          user.role.push("subBusiness");
          await user.save();
        } else {
          console.log("Role already includes 'subBusiness'. No changes made.");
        }

        const updatedSeller = await seller.save();
        return updatedSeller;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  // BA Approval done by selecting seller from the list
  approveBySuperSeller: authenticate(["admin", "superSeller"])(
    async (_, { sellerid }, { models, req }) => {
      try {
        // -----------------------------------------------------------------------------
        // Authenticate user from JWT token
        // -----------------------------------------------------------------------------
        const token = req.headers.authorization.split(" ")[1];
        if (!token) {
          throw new Error("Authorization token missing");
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch logged-in user (Super Seller / BA)
        const user = await models.User.findById(decoded._id);

        const updatedUser = await models.User.findOneAndUpdate(
          { seller: sellerid },
          { $addToSet: { role: "subBusiness" } },
          { new: true }
        );

        if (!updatedUser) {
          throw new Error("User not found");
        }

        // Get BA name
        const baName = await models.Seller.findOne(user.seller);

        if (!baName) {
          throw new Error("BA name not found");
        }

        // Fetch seller to be approved
        const seller = await models.Seller.findById(sellerid);
        if (!seller) {
          throw new Error("Seller not found");
        }

        // Link Super Seller (BA) to Seller
        seller.superSellerId.push(user.seller);

        // Set dealer approval status (default false)
        seller.dealerstatus = false;

        // Add allotted mapping for BA → Dealer
        seller.allotted.push({
          dealerId: sellerid,
          baId: user.seller,
          dastatus: false,
        });

        // Save updated seller
        const updatedSeller = await seller.save();
        // -----------------------------------------------------------------------------
        // Send confirmation email to seller & admin
        // -----------------------------------------------------------------------------
        {
          const master = await models.StoreFeature.findOne({});

          const emaildata = await models.SiteContent.findOne({
            key: "businessDealerRegistrationMail",
          });

          const subjectdata = await models.SiteContent.findOne({
            key: "businessDealerRegistrationSubject",
          });

          const adminemail = await models.SiteContent.findOne({
            key: "adminEnquiryEmail",
          });

          const bodyTemplate = emaildata?.content || "";
          const subjectTemplate =
            subjectdata?.content || "Dealer Registration Success on $website";

          const params = {
            $baName: baName.companyName || "",
            $dealerName: updatedSeller.companyName || "",
            $dealergst: updatedSeller.gstin || "",
            $dealeraddress: updatedSeller.fullAddress || "",
            $dealercity: updatedSeller.city || "",
            $dealerstate: updatedSeller.state || "",
            $dealerpincode: updatedSeller.pincode || "",
            $dealerdescription: updatedSeller.companyDescription || "",
            $dealerMobileNo: updatedSeller.mobileNo || "",
            $dealeremail: updatedSeller.email || "",
            $website: master?.storeName || "",
          };

          const modifiedSubject = subjectTemplate.replace(
            /\$\w+/g,
            (match) => params[match] || match
          );

          const modifiedBody = bodyTemplate.replace(
            /\$\w+/g,
            (match) => params[match] || match
          );

          // Email configuration
          const mailOptions = {
            from: process.env.SMTP_USER,
            to: updatedSeller.email,
            cc: [adminemail?.content],
            subject: modifiedSubject,
            html: modifiedBody.replace(/<br>/g, ""),
          };

          await transporter.sendMail(mailOptions);
        }

        // -----------------------------------------------------------------------------
        // Return updated seller
        // -----------------------------------------------------------------------------
        return updatedSeller;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  daApproveByPortalAdmin: authenticate(["admin"])(
    async (_, { sellerid, baID }, { models, req }) => {
      try {
        const seller = await models.Seller.findById(sellerid);

        if (!seller) throw new Error("Seller not found");

        const baName = await models.Seller.findById(baID);
        if (!seller) throw new Error("Seller not found");

        console.log("seller", baName);
        // Ensure 'allotted' array exists
        if (!Array.isArray(seller.allotted)) seller.allotted = [];

        // // Find allotted entry matching current user's baId
        const entry = seller.allotted.find(
          (item) => item.baId.toString() === baID
        );
        if (!entry) throw new Error("BA entry not found for current user");

        // Toggle dastatus
        entry.dastatus = entry.dastatus === true ? false : true;
        seller.dealerstatus = true;
        // -----------------------------------------------------------------------------
        // Return updated seller
        // -----------------------------------------------------------------------------
        await seller.save();

        // -----------------------------------------------------------------------------
        // Send confirmation email to seller & admin
        // -----------------------------------------------------------------------------
        {
          const master = await models.StoreFeature.findOne({});

          const emaildata = await models.SiteContent.findOne({
            key: "businessDealerRequestApprove",
          });

          const subjectdata = await models.SiteContent.findOne({
            key: "businessDealerRequestApproveSubject",
          });

          const adminemail = await models.SiteContent.findOne({
            key: "adminEnquiryEmail",
          });

          const bodyTemplate = emaildata?.content || "";
          const subjectTemplate =
            subjectdata?.content ||
            "Dealer Associate Approved Successfully on $website";

          const params = {
            $baName: baName.companyName || "",
            $dealerName: seller.companyName || "",
            $dealergst: seller.gstin || "",
            $dealeraddress: seller.fullAddress || "",
            $dealercity: seller.city || "",
            $dealerstate: seller.state || "",
            $dealerpincode: seller.pincode || "",
            $dealerdescription: seller.companyDescription || "",
            $dealerMobileNo: seller.mobileNo || "",
            $dealeremail: seller.email || "",
            $website: master?.storeName || "",
          };

          const modifiedSubject = subjectTemplate.replace(
            /\$\w+/g,
            (match) => params[match] || match
          );

          const modifiedBody = bodyTemplate.replace(
            /\$\w+/g,
            (match) => params[match] || match
          );

          // Email configuration
          const mailOptions = {
            from: process.env.SMTP_USER,
            to: seller.email,
            cc: [adminemail?.content],
            subject: modifiedSubject,
            html: modifiedBody.replace(/<br>/g, ""),
          };

          await transporter.sendMail(mailOptions);
        }
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  deleteSeller: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      const seller = await models.Seller.findById(id);
      if (!seller) {
        throw new Error("Seller not found");
      }

      const user = await models.User.findById(seller.user);
      user.role = user.role.filter((role) => role !== "seller");
      user.seller = undefined;
      await user.save();

      const deletedSeller = await models.Seller.findByIdAndRemove(id);
      return deletedSeller;
    } catch (error) {
      throw new Error(error);
    }
  }),
  generateSellerBill: authenticate(["admin", "seller", "accounts"])(
    async (_, { sellerid, invoicedate }, { models, req }) => {
      try {
        const invoiceDate = new Date(invoicedate);
        // Get the current date
        const currentDate = new Date();
        const master = await models.StoreFeature.findOne({});
        // Check if the invoice date is in the current month
        const isInCurrentMonth =
          invoiceDate.getMonth() === currentDate.getMonth() &&
          invoiceDate.getFullYear() === currentDate.getFullYear();

        const bill = await models.SellerBill.findOne({
          sellerId: sellerid,
          invoiceDate: invoicedate,
        });
        if (!bill && !isInCurrentMonth) {
          const latestBill = await models.SellerBill.findOne().sort({
            _id: -1,
          });
          let billno = "";

          if (latestBill) {
            const parts = latestBill.billNumber.split("/");
            const extractedPart = parts[parts.length - 1];
            const billstring = (extractedPart * 1 + 1)
              .toString()
              .padStart(4, "0");
            billno = `${master.comBillFormate}/${billstring}`;
          } else {
            let newbill = "1";
            const billstring = newbill.padStart(4, "0");
            billno = `${master.comBillFormate}/${billstring}`;
          }
          const newBill = new models.SellerBill({
            billNumber: billno,
            sellerId: sellerid,
            invoiceDate: invoicedate,
          });
          return await newBill.save();
        } else if (isInCurrentMonth) {
          throw new Error("Bill cannot be generated in current month");
        } else {
          return bill;
        }
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
};

export const Seller = {
  user: async (seller, _, { models }) => {
    try {
      return await models.User.findById(seller.user);
    } catch (error) {
      throw new Error(error);
    }
  },
  superSellerId: async (seller, _, { models }) => {
    try {
      let superArray = [];
      for (const data of seller.superSellerId) {
        const new1 = await models.Seller.findById(data);
        superArray.push(new1);
      }
      return superArray;
    } catch (error) {
      throw new Error(error);
    }
  },
};
