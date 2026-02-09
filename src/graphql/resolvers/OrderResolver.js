// src/resolvers/OrderResolver.js
import authenticate from "../../middlewares/auth.js";
import { processFile } from "../../services/fileUploadService.js";
import nodemailer from "nodemailer";
import moment from "moment";
import jwt from "jsonwebtoken";
import doubletick from "@api/doubletick";
import axios from "axios";
// import Shipping from "./../../models/Shipping";
import Shipping from "./../../models/Shipping.js";

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
  getOrder: async (_, { id }, { models }) => {
    try {
      return await models.Order.findById(id);
    } catch (error) {
      throw new Error(error);
    }
  },
  getOrderForHomePage: async (_, { id }, { models }) => {
    try {
      return await models.Order.findById(id);
    } catch (error) {
      throw new Error(error);
    }
  },
  getUserorder: authenticate(["customer"])(async (_, args, { models, req }) => {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await models.User.findById(decoded._id);
    return await models.Order.find({ user: user.id });
  }),
    
  getAllOrder: authenticate(["admin", "accounts"])(
    async (_, { search, limit, offset, sortBy, sortOrder }, { models }) => {
      try {
        const query = {};
        if (search) { 
          const searchRegex = new RegExp("^" + search, "i");

          query.$or = [
            { orderId: searchRegex },
            { firstName: searchRegex },
            { lastName: searchRegex },
            { customerName: searchRegex },
            { orderdate: searchRegex },
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

        return await models.Order.find({ ...query })
          .collation(collationOptions)
          .sort(sortOptions)
          .limit(limit)
          .skip(offset);
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  getUserAllOrder: authenticate(["customer"])(async (_, args, { models }) => {
    try {
      return await models.Order.find({ user: args.userId });
    } catch (error) {
      throw new Error(error);
    }
  }),
  getOrderForseller: authenticate(["seller", "subBusiness"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);

        const onlineandcodeorders = await models.Order.find({
          $or: [{ paymentMethod: "ONLINE" }, { paymentMethod: "COD" }],
        });

        const dmtorders = await models.Order.find({
          $and: [{ paymentMethod: "DMT" }, { paymentStatus: "complete" }],
        });

        const filterorder = [...onlineandcodeorders, ...dmtorders];
        let orderfiltered = [];

        const updatedorder = filterorder.map(async (data) => {
          const matchedLocations = data.orderProducts.filter((location) => {
            return String(location.sellerId) === String(user.seller);
          });
          if (matchedLocations.length !== 0) {
            const newOrder = {
              ...data._doc,
              id: data._id,
              orderProducts: matchedLocations,
            };
            orderfiltered.push(newOrder);
          }
        });
        if (orderfiltered.length === 0) {
          console.log("No order found for the seller");
        }

        return orderfiltered;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  getSellerIssueOrders: authenticate(["seller", "subBusiness"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const { _id } = jwt.verify(token, process.env.JWT_SECRET);
        const { seller: sellerId } = await models.User.findById(_id);

        // 🧾 Find bills with accounts_status = false for this seller
        const billOrderIds = (
          await models.Bill.find({ sellerId, accounts_status: false }).select(
            "orderId"
          )
        ).map((b) => b.orderId);

        if (!billOrderIds.length) return [];

        // 🧠 Fetch relevant orders (ONLINE, COD, DMT complete)
        const orders = await models.Order.find({
          _id: { $in: billOrderIds },
          $or: [
            { paymentMethod: "ONLINE" },
            { paymentMethod: "COD" },
            { paymentMethod: "DMT" },
          ],
        });

        // 🛍 Filter products for this seller and DMT complete orders
        return orders
          .filter(
            (o) => o.paymentMethod !== "DMT" || o.paymentStatus === "complete"
          )
          .map((o) => {
            const orderProducts = o.orderProducts.filter(
              (p) => String(p.sellerId) === String(sellerId)
            );
            return orderProducts.length
              ? { ...o._doc, id: o._id, orderProducts }
              : null;
          })
          .filter(Boolean);
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  getSingleOrderForseller: authenticate(["seller", "subBusiness"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const filterorder = await models.Order.findById(args.id);
        
        const matchedLocations = filterorder.orderProducts.filter(
          (location) => {
            return String(location.sellerId) === String(user.seller);
          }
        );
        
        const newOrder = {
          ...filterorder._doc,
          id: filterorder._id,
          orderProducts: matchedLocations,
        }; 
        return newOrder;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  getOrderBySellerId: authenticate(["admin"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const filterorder = await models.Order.find();
        let orderfiltered = [];
        const updatedorder = filterorder.map(async (data) => {
          const matchedLocations = data.orderProducts.filter((location) => {
            return String(location.sellerId) === String(args.sellerId);
          });
          if (matchedLocations.length !== 0) {
            const newOrder = {
              ...data._doc,
              id: data._id,
              orderProducts: matchedLocations,
            };
            orderfiltered.push(newOrder);
          }
        });
        if (orderfiltered.length === 0) {
          console.log("No order found for the seller");
        }
        return orderfiltered;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  
  getSingleOrderBySellerId: authenticate(["admin"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const filterorder = await models.Order.findById(args.orderId);

        const matchedLocations = filterorder.orderProducts.filter(
          (location) => {
            return String(location.sellerId) === String(args.sellerId);
          }
        );
        return {
          ...filterorder._doc,
          id: filterorder._id,
          orderProducts: matchedLocations,
        };
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  getBillByPackedId: async (_, { packedID }, { models }) => {
    try {
      const bill = await models.Bill.findOne({ packedID: packedID });
      return bill;
    } catch (error) {
      throw new Error(error);
    }
  },

  getAllBills: async (_, args, { models }) => {
    try {
      return await models.Bill.find();
    } catch (error) {
      throw new Error(error);
    }
  },

  getSellerOrderWithDate: authenticate(["admin", "seller", "accounts", "subBusiness"])(
    async (_, args, { models }) => {
      try {
        const startDate = new Date(args.startDate);
        const endDate = new Date(args.endDate);

        const orders = await models.Order.find({
          paymentStatus: "complete",
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        });

        let orderfiltered = [];
        const updatedorder = orders.map(async (data) => {
          const matchedLocations = data.orderProducts.filter((location) => {
            return String(location.sellerId) === String(args.sellerId);
          });
          if (matchedLocations.length !== 0) {
            const newOrder = {
              ...data._doc,
              id: data._id,
              orderProducts: matchedLocations,
            };
            orderfiltered.push(newOrder);
          }
        });
        if (orderfiltered.length === 0) {
          console.log("No order found for the seller");
        }
        return orderfiltered;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  getSellerBillWithDate: authenticate(["admin", "seller", "accounts", "subBusiness"])(
    async (_, args, { models }) => {
      try {
        const month = args.month;
        const year = args.year;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);

        const bills = await models.Bill.find({
          sellerId: args.sellerId,
          createdAt: {
            $gt: startDate,
            $lte: endDate,
          },
        });

        return bills;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
};

export const Mutation = {
  createOrder: authenticate(["customer"])(async (_, args, { models, req }) => {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await models.User.findById(decoded._id);
      const shipping = await models.Address.findById(args.shippingAddress);
      const billing = await models.Address.findById(args.billingAddress);
      const updatedShipping = {
        firstName: shipping.firstName,
        lastName: shipping.lastName,
        mobileNo: shipping.mobileNo,
        addressLine1: shipping.addressLine1,
        addressLine2: shipping.addressLine2,
        city: shipping.city,
        state: shipping.state,
        postalCode: shipping.postalCode,
        country: shipping.country,
        altrMobileNo: shipping.altrMobileNo,
        businessName: shipping.businessName,
        gstin: shipping.gstin,
      };
      const updatedBilling = {
        firstName: billing.firstName,
        lastName: billing.lastName,
        mobileNo: billing.mobileNo,
        addressLine1: billing.addressLine1,
        addressLine2: billing.addressLine2,
        city: billing.city,
        state: billing.state,
        postalCode: billing.postalCode,
        country: billing.country,
        altrMobileNo: billing.altrMobileNo,
        businessName: billing.businessName,
        gstin: billing.gstin,
      };
      const enrichedCartProducts = await Promise.all(
        args.orderProducts.map(async (product) => {
          try {
            const nestedProduct = await models.Product.findById(
              product.productId
            );
            if (!nestedProduct) {
              const seriesnestedProduct = await models.SeriesProduct.findById(
                product.productId
              );
              if (!seriesnestedProduct) {
                const tmtseriesnestedProduct =
                  await models.TMTSeriesProduct.findById(product.productId);
                if (!tmtseriesnestedProduct) {
                  // const superProduct = await models.SuperSellerProduct.findById(
                  //   product.productId
                  // );
                  // const superseriesvariant = superProduct.supervariant.find(
                  //   (obj) => obj._id.toString() === product.variantId.toString()
                  // );
                  // const superlocation = superseriesvariant.superlocation.find(
                  //   (obj) =>
                  //     obj._id.toString() === product.locationId.toString()
                  // );
                  return {
                    ...product._doc,
                    locationId: product.locationId,
                    variantId: product.variantId,
                    productId: product.productId,
                    sellerId: product.sellerId,
                    price: product.price,
                    quantity: product.quantity,
                    iprice: product.iprice,
                    igst: product.igst,
                    idiscount: product.idiscount,
                    iextraChargeType: product.iextraChargeType,
                    iextraCharge: product.iextraCharge,
                    itransportChargeType: product.itransportChargeType,
                    itransportCharge: product.itransportCharge,
                  };
                }
                const tmtseriesvariant =
                  tmtseriesnestedProduct.tmtseriesvariant.find(
                    (obj) => obj._id.toString() === product.variantId.toString()
                  );
                const tmtserieslocation =
                  tmtseriesvariant.tmtserieslocation.find(
                    (obj) =>
                      obj._id.toString() === product.locationId.toString()
                  );
                return {
                  ...product._doc,
                  locationId: product.locationId,
                  variantId: product.variantId,
                  productId: product.productId,
                  sellerId: tmtserieslocation.sellerId,
                  price: product.price,
                  quantity: product.quantity,
                  iprice: product.iprice,
                  igst: product.igst,
                  idiscount: product.idiscount,
                  iextraChargeType: product.iextraChargeType,
                  iextraCharge: product.iextraCharge,
                  itransportChargeType: product.itransportChargeType,
                  itransportCharge: product.itransportCharge,
                };
              }
              const seriesvariant = seriesnestedProduct.seriesvariant.find(
                (obj) => obj._id.toString() === product.variantId.toString()
              );
              const serieslocation = seriesvariant.serieslocation.find(
                (obj) => obj._id.toString() === product.locationId.toString()
              );
              return {
                ...product._doc,
                locationId: product.locationId,
                variantId: product.variantId,
                productId: product.productId,
                sellerId: serieslocation.sellerId,
                price: product.price,
                quantity: product.quantity,
                iprice: product.iprice,
                igst: product.igst,
                idiscount: product.idiscount,
                iextraChargeType: product.iextraChargeType,
                iextraCharge: product.iextraCharge,
                itransportChargeType: product.itransportChargeType,
                itransportCharge: product.itransportCharge,
              };
            }
            const variant = nestedProduct.variant.find(
              (obj) => obj._id.toString() === product.variantId.toString()
            );
            const location = variant.location.find(
              (obj) => obj._id.toString() === product.locationId.toString()
            );
            return {
              ...product._doc,
              locationId: product.locationId,
              variantId: product.variantId,
              productId: product.productId,
              sellerId: location.sellerId,
              price: product.price,
              quantity: product.quantity,
              iprice: product.iprice,
              igst: product.igst,
              idiscount: product.idiscount,
              iextraChargeType: product.iextraChargeType,
              iextraCharge: product.iextraCharge,
              itransportChargeType: product.itransportChargeType,
              itransportCharge: product.itransportCharge,
            };
          } catch (error) {
            console.error(error);
            throw new Error(error);
          }
        })
      );

      const newOrder = new models.Order({
        user: user.id,
        paymentMethod: args.paymentMethod,
        totalAmount: args.totalAmount,
        acutalTotalAmount: args.acutalTotalAmount,
        shippingAmount: args.shippingAmount,
        orderProducts: enrichedCartProducts,
        freeDelivery: args.freeDelivery,
        shippingAddress: updatedShipping,
        billingAddress: updatedBilling,
        status: args.status,
        couponName: args.couponName,
        couponDiscount: args.couponDiscount,
        onlinePaymentCharge: args.onlinePaymentCharge,
        dmtPaymentDiscount: args.dmtPaymentDiscount,
        couponDiscountPercentage: args.couponDiscountPercentage,
        onlinePaymentChargePercentage: args.onlinePaymentChargePercentage,
        dmtPaymentDiscountPercentage: args.dmtPaymentDiscountPercentage,
      });
      const savedorder = await newOrder.save();

      // send email ---------------------------------------
      const master = await models.StoreFeature.findOne({});
      const adminemail = await models.SiteContent.findOne({
        key: "adminEnquiryEmail",
      });
      const accemail = await models.SiteContent.findOne({
        key: "accountsEnquiryEmail",
      });
      const emaildata = await models.SiteContent.findOne({
        key: "buyRequest",
      });
      const olink = `${process.env.FRONT_URL}/order/${savedorder.id}`;
      const params = {
        $firstname: user.firstName,
        $lastname: user.lastName,
        $mobile: user.mobileNo,
        $email: user.email,
        $website: master.storeName,
        $orderid: savedorder.id,
        $orderlink: olink,
        $amount: savedorder.totalAmount,
        $address1: savedorder.shippingAddress.addressLine1,
        $address2: savedorder.shippingAddress.addressLine2,
        $city: savedorder.shippingAddress.city,
        $state: savedorder.shippingAddress.state,
        $pincode: savedorder.shippingAddress.postalCode,
      };
      if (savedorder.paymentMethod === "ONLINE") {
        // Online email send code
        const emaildata = await models.SiteContent.findOne({
          key: "onlineTryEmail",
        });
        const emaildatasubject = await models.SiteContent.findOne({
          key: "onlineTryEmailsubject",
        });
        const inputString = emaildata.content;
        const inputStringsubject = emaildatasubject.content;
        // const subject = "Online Option Created Successfully on $website";
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
          to: adminemail.content,
          // cc: [adminemail.content],
          subject: modifiedsubject,
          html: modifiedString.replace(/<br>/g, ""),
        };
        await transporter.sendMail(mailOptions);
      } else if (savedorder.paymentMethod === "DMT") {
        // DMT email send code
        const emaildata = await models.SiteContent.findOne({
          key: "buyRequest",
        });
        const emaildatasubject = await models.SiteContent.findOne({
          key: "buyRequestsubject",
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
          cc: [adminemail.content],
          subject: modifiedsubject,
          html: modifiedString.replace(/<br>/g, ""),
        };
        await transporter.sendMail(mailOptions);
      }
      // end mail -------------------------------------
      return savedorder;
    } catch (error) {
      throw new Error(error);
    }
  }),

  createBill: authenticate(["seller", "subBusiness"])(async (_, args, { models, req }) => {
    try {    
      const bill = await models.Bill.findOne({ packedID: args.packedID });
      const master = await models.StoreFeature.findOne({});
      if (!bill) {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const seller = await models.Seller.findOne({ user: decoded._id });
        const latestBill = await models.Bill.findOne({
          sellerId: seller._id,
        }).sort({ _id: -1 });

        const companyName = seller.companyName.slice(0, 2);
        function getCurrentFinancialYear() {
          const now = moment();
          const fiscalYearStartMonth = 3;
          if (now.month() >= fiscalYearStartMonth) {
            const currentYear = now.format("YY");
            const nextYear = now.clone().add(1, "year").format("YY");
            return `${currentYear}${nextYear}`;
          } else {
            const currentYear = now.year().toString().slice(-2);
            const previousYear = now
              .clone()
              .subtract(1, "year")
              .year()
              .toString()
              .slice(-2);
            return `${previousYear}${currentYear}`;
          }
        }
        const currentFinancialYear = getCurrentFinancialYear();
        let billno = "";
        if (latestBill) {
          const parts = latestBill.billNumber.split("/");
          const extractedPart = parts[parts.length - 1];
          const billstring = (extractedPart * 1 + 1)
            .toString()
            .padStart(3, "0");
          billno = `${seller.bill}/${currentFinancialYear}/${master.sellerBillFormate}/${billstring}`; // Narayan code change....
        } else {
          let newbill = "1";
          const billstring = newbill.padStart(3, "0");
          billno = `${seller.bill}/${currentFinancialYear}/${master.sellerBillFormate}/${billstring}`; // Narayan code change....
        }

        const newBill = new models.Bill({
          packedID: args.packedID,
          billNumber: billno,
          sellerId: seller._id,
          billedProducts: args.billedProducts,
          listingComm: args.listingComm,
          productComm: args.productComm,
          shippingComm: args.shippingComm,
          fixedComm: args.fixedComm,
          paymentGateway: args.paymentGateway,
          tds: args.tds,
          tcs: args.tcs,
          gstComm: args.gstComm,
          orderAmount: args.orderAmount,
          settlementAmount: args.settlementAmount,
          orderId: args.orderId,
        });
        return await newBill.save();
      } else {
        return bill;
      }
    } catch (error) {
      throw new Error(error);
    }
  }),

  updateBillPayment: authenticate(["admin", "accounts"])(
    async (_, args, { models }) => {
      try {
        const {
          id,
          payment_status,
          payment_mode,
          transaction_ref_no,
          transaction_date,
        } = args;

        const bill = await models.Bill.findById(id);
        if (!bill) {
          throw new Error("Bill not found");
        }

        if (payment_status !== undefined) bill.payment_status = payment_status;
        if (payment_mode !== undefined) bill.payment_mode = payment_mode;
        if (transaction_ref_no !== undefined)
          bill.transaction_ref_no = transaction_ref_no;
        if (transaction_date !== undefined)
          bill.transaction_date = transaction_date;

        await bill.save();
        return bill;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  customerIssue: authenticate(["customer"])(async (_, args, { models }) => {
    const bill = await models.Bill.findById(args.id);
    if (!bill) throw new Error("Bill not found");

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

    Object.assign(bill, {
      customer_issue: args.customer_issue,
      customer_issue_date: formattedDate,
      accounts_status: false,
      images: args.images,
      customer_issue_title: args.customer_issue_title,
    });
    await bill.save();
    return bill;
  }),

  customerIssueResolve: authenticate(["accounts", "admin"])(
    async (_, args, { models }) => {
      const bill = await models.Bill.findById(args.id);
      if (!bill) throw new Error("Bill not found");
      const formattedDate = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "short",
        timeStyle: "medium",
        hour12: true,
      }).format(new Date());

      Object.assign(bill, {
        accounts_status: true,
        issue_resolved_date: formattedDate,
      });
      await bill.save();
      return bill;
    }
  ),

  orderPacked: authenticate(["seller", "subBusiness"])(
    async (
      _,
      { id, status, file, orderProducts, packedDate },
      { models, req }
    ) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const users = await models.User.findById(decoded._id);
        const order = await models.Order.findById(id);
        const finduser = await models.User.findById(order.user);
        const master = await models.StoreFeature.findOne({});
        const orderlinkcustomer = `${process.env.FRONT_URL}/order/${order.id}`;
        const seller = await models.Seller.findOne({ user: users.id });
        const shippingDetails = `           
          ${order.shippingAddress.addressLine1}, 
          ${order.shippingAddress.addressLine2 || ""}, 
          ${order.shippingAddress.city}, 
          ${order.shippingAddress.state} - 
          ${order.shippingAddress.postalCode}
        `
          .replace(/\s+/g, " ")
          .trim();
        const createdAtDate = new Date(order.createdAt);
        const formattedDate = createdAtDate.toLocaleDateString("en-GB");
        const next10thDay = new Date();
        next10thDay.setDate(next10thDay.getDate() + 10);
        const formattedNext10thDay = next10thDay.toLocaleDateString("en-GB");

        let filepath = "";
        if (file) {
          const result = await processFile(file);
          const responseData = {
            filename: result.uniqueFilename,
          };
          filepath = process.env.BASE_URL + responseData.filename;
          order.status = status;
          const updatedArray1 = order.orderProducts.map((item1) => {
            const matchingItem = orderProducts.find(
              (item2) =>
                item1.variantId.toString() === item2.variantId.toString()
            );
            return matchingItem
              ? {
                  ...item1,
                  packedImage: filepath,
                  packedDate: packedDate,
                  productStatus: "Order Packed",
                }
              : item1;
          });
          order.orderProducts = updatedArray1;
          await order.save();

          // Send Email Start ---------------------------------------------------------------------
          {
            const adminemail = await models.SiteContent.findOne({
              key: "adminEnquiryEmail",
            });
            const emaildata = await models.SiteContent.findOne({
              key: "orderPacked",
            });
            const emaildatasubject = await models.SiteContent.findOne({
              key: "orderPackedsubject",
            });
            const inputString = emaildata.content;
            const inputStringsubject = emaildatasubject.content;
            const params = {
              $firstname: order.shippingAddress.firstName,
              $lastname: order.shippingAddress.lastName,
              $mobile: order.shippingAddress.mobileNo,
              $email: finduser.email,
              $amount: order.totalAmount,
              $orderlink: orderlinkcustomer,
              $orderid: order.id,
              $seller: seller.companyName,
              $website: master.storeName,
              $packedate: packedDate,
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
              to: finduser.email,
              cc: [seller.email, adminemail.content],
              subject: modifiedsubject,
              html: modifiedString.replace(/<br>/g, ""),
            };
            await transporter.sendMail(mailOptions);
          }
          // End of email -------------------------------------------------------------

          // SMS Start (Order shiped/ Send SMS only customer. )
          {
            const params = {
              $firstname: order.shippingAddress.firstName,
              $lastname: order.shippingAddress.lastName,
              $mobile: order.shippingAddress.mobileNo,
              $email: finduser.email,
              $amount: order.totalAmount,
              $orderlink: orderlinkcustomer,
              $orderid: order.id,
              $seller: seller.companyName,
              $website: master.storeName,
              $packedate: packedDate,
            };
            const sms = await models.SiteContent.findOne({
              key: "orderpacksms",
            });
            const smsmessage = sms.content.split("#")[0];
            const sender_id = sms.content.split("#")[1];
            const temp_id = sms.content.split("#")[2];
            const apiUrl = "http://sms.bulkssms.com/submitsms.jsp";
            const user = "AGBCIN";
            const key = "87145d14eeXX";
            const mobile = `+91${order.shippingAddress.mobileNo}`;
            const message = smsmessage.replace(
              /\$\w+/g,
              (match) => params[match] || match
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
          // SMS End .........................................................

          // Whatsapp Start ..................................................
          // Parameters of dynamic field: ["Customer Name","Order Id","Order Date","Packed Date","Customer Name","Delivery Address","Mobile Number","Website Name","Website Name"]
          if (master.whatsappAPINo) {
            const whatsappmessage = await models.SiteContent.findOne({
              key: "orderpackwhatsapp",
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
                            `${order.shippingAddress.firstName}`,
                            `${order.id}`,
                            `${formattedDate}`,
                            `${packedDate}`,
                            `${order.shippingAddress.firstName}`,
                            `${shippingDetails}`,
                            `${order.shippingAddress.mobileNo}`,
                            `${master.storeName}`,
                            `${master.storeName}`,
                          ],
                        },
                      },
                      templateName: `${whatsappmessage.content}`,
                    },
                    from: `+91${master.whatsappAPINo}`,
                    to: `+91${order.shippingAddress.mobileNo}`,
                  },
                ],
              })
              .then(({ data }) => console.log(data))
              .catch((err) => console.error(err));
          }
          // Whatsapp End   ..................................................

          return order;
        } else {
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 90000) + 10000;
          const identifier = `packed-${random}-${timestamp}`;
          // Find and update elements in array1 based on array2
          const updatedArray1 = order.orderProducts.map((item1) => {
            const matchingItem = orderProducts.find(
              (item2) =>
                item1.variantId.toString() === item2.variantId.toString()
            );
            // If a match is found, update the element, otherwise keep it as is
            return matchingItem
              ? {
                  ...item1,
                  packed: true,
                  packageIdentifier: identifier,
                }
              : item1;
          });
          order.orderProducts = updatedArray1;
          await order.save();
          return order;
        }
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  orderShipped: authenticate(["seller", "subBusiness"])(
    async (
      _,
      {
        id,
        status,
        shippedBy,
        trackingNo,
        trackingUrl,
        file,
        orderProducts,
        shippedDate,
      },
      { models, req }
    ) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const users = await models.User.findById(decoded._id);
        const order = await models.Order.findById(id);
        const finduser = await models.User.findById(order.user);
        const result = await processFile(file);
        const orderlinkcustomer = `${process.env.FRONT_URL}/order/${order.id}`;
        const seller = await models.Seller.findOne({ user: users.id });
        const master = await models.StoreFeature.findOne({});
        const responseData = { filename: result.uniqueFilename };
        const filepath = process.env.BASE_URL + responseData.filename;
        const createdAtDate = new Date(order.createdAt);
        const formattedDate = createdAtDate.toLocaleDateString("en-GB");
        order.status = status;
        // Find and update elements in array1 based on array2
        const updatedArray1 = order.orderProducts.map((item1) => {
          const matchingItem = orderProducts.find(
            (item2) => item1.variantId.toString() === item2.variantId.toString()
          );

          // If a match is found, update the element, otherwise keep it as is
          return matchingItem
            ? {
                ...item1,
                shippedBy: shippedBy,
                trackingNo: trackingNo,
                trackingUrl: trackingUrl,
                shippedImage: filepath,
                shipped: true,
                shippedDate: shippedDate,
                productStatus: "Order Shipped",
              }
            : item1;
        });
        order.orderProducts = updatedArray1;
        await order.save();

        // Send email -------------------------------------------------------------------------
        {
          const adminemail = await models.SiteContent.findOne({
            key: "adminEnquiryEmail",
          });
          const emaildata = await models.SiteContent.findOne({
            key: "orderDispatched",
          });
          const emaildatasubject = await models.SiteContent.findOne({
            key: "orderDispatchedsubject",
          });
          const inputString = emaildata.content;
          const inputStringsubject = emaildatasubject.content;
          const params = {
            $firstname: order.shippingAddress.firstName,
            $lastname: order.shippingAddress.lastName,
            $mobile: order.shippingAddress.mobileNo,
            $email: finduser.email,
            $amount: order.totalAmount,
            $orderlink: orderlinkcustomer,
            $orderid: order.id,
            $seller: seller.companyName,
            $website: master.storeName,
            $shippedby: shippedBy,
            $trackingno: trackingNo,
            $trackingurl: trackingUrl,
            $shippeddate: shippedDate,
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
            to: finduser.email,
            cc: [seller.email, adminemail.content],
            subject: modifiedsubject,
            html: modifiedString.replace(/<br>/g, ""),
          };
          await transporter.sendMail(mailOptions);
        }
        // End mail ---------------------------------------------------------------------------

        // SMS Start (Order shiped/ Send SMS only customer. ) ---------------------------------
        {
          const params = {
            $firstname: order.shippingAddress.firstName,
            $lastname: order.shippingAddress.lastName,
            $mobile: order.shippingAddress.mobileNo,
            $email: finduser.email,
            $amount: order.totalAmount,
            $orderlink: orderlinkcustomer,
            $orderid: order.id,
            $seller: seller.companyName,
            $website: master.storeName,
            $shippedby: shippedBy,
            $trackingno: trackingNo,
            $trackingurl: trackingUrl,
            $shippeddate: shippedDate,
          };
          const sms = await models.SiteContent.findOne({
            key: "orderShipping",
          });
          const smsmessage = sms.content.split("#")[0];
          const sender_id = sms.content.split("#")[1];
          const temp_id = sms.content.split("#")[2];
          const apiUrl = "http://sms.bulkssms.com/submitsms.jsp";
          const user = "AGBCIN";
          const key = "87145d14eeXX";
          const mobile = `+91${order.shippingAddress.mobileNo}`;
          const message = smsmessage.replace(
            /\$\w+/g,
            (match) => params[match] || match
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
        // SMS End -----------------------------------------------

        // Whatsapp Start ..................................................
        // Parameters of dynamic field: ["Customer Name","Order ID","Order Date","Courier Partner","Tracking No","Live Tracking URL","Website Name","Website Name"]},"buttons":[{"type":"URL","parameter":"{{url}}"}]
        if (master.whatsappAPINo) {
          const whatsappmessage = await models.SiteContent.findOne({
            key: "ordershipwhatsapp",
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
                          `${order.shippingAddress.firstName}`,
                          `${order.id}`,
                          `${formattedDate}`,
                          `${shippedBy}`,
                          `${trackingNo}`,
                          `${trackingUrl}`,
                          `${master.storeName}`,
                          `${master.storeName}`,
                        ],
                      },
                      buttons: [{ type: "URL", parameter: `${order.id}` }],
                    },
                    templateName: `${whatsappmessage.content}`,
                  },
                  from: `+91${master.whatsappAPINo}`,
                  to: `+91${order.shippingAddress.mobileNo}`,
                },
              ],
            })
            .then(({ data }) => console.log(data))
            .catch((err) => console.error(err));
        }
        // Whatsapp End   ..................................................

        return order;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  orderDelivered: authenticate(["seller", "subBusiness"])(
    async (
      _,
      { id, status, orderProducts, deliveredDate },
      { models, req }
    ) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const users = await models.User.findById(decoded._id);
        const order = await models.Order.findById(id);
        const finduser = await models.User.findById(order.user);
        const orderlinkcustomer = `${process.env.FRONT_URL}/order/${order.id}`;
        const seller = await models.Seller.findOne({ user: users.id });
        const master = await models.StoreFeature.findOne({});
        // const result = await processFile(file);
        // const responseData = {
        //   filename: result.uniqueFilename,
        // };
        // const filepath = process.env.BASE_URL + responseData.filename;

        order.status = status;

        // Find and update elements in array1 based on array2
        const updatedArray1 = order.orderProducts.map((item1) => {
          const matchingItem = orderProducts.find(
            (item2) => item1.variantId.toString() === item2.variantId.toString()
          );

          // If a match is found, update the element, otherwise keep it as is
          return matchingItem
            ? {
                ...item1,
                delivered: true,
                deliveredDate: deliveredDate,
                productStatus: "Order Delivered",
              }
            : item1;
        });

        order.orderProducts = updatedArray1;
        await order.save();

        // Send Email ----------------------------------------------------------------------------
        {
          const adminemail = await models.SiteContent.findOne({
            key: "adminEnquiryEmail",
          });
          const emaildata = await models.SiteContent.findOne({
            key: "orderDelivery",
          });
          const emaildatasubject = await models.SiteContent.findOne({
            key: "orderDeliverysubject",
          });
          const inputString = emaildata.content;
          const inputStringsubject = emaildatasubject.content;
          const params = {
            $firstname: order.shippingAddress.firstName,
            $lastname: order.shippingAddress.lastName,
            $mobile: order.shippingAddress.mobileNo,
            $email: finduser.email,
            $amount: order.totalAmount,
            $orderlink: orderlinkcustomer,
            $orderid: order.id,
            $seller: seller.companyName,
            $website: master.storeName,
            $delivereddate: deliveredDate,
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
            to: finduser.email,
            cc: [seller.email, adminemail.content],
            subject: modifiedsubject,
            html: modifiedString.replace(/<br>/g, ""),
          };
          await transporter.sendMail(mailOptions);
        }
        // End Email ----------------------------------------------------------------------------

        // SMS Start (Order delivered/ Send SMS only customer. ) --------------------------------
        {
          const params = {
            $firstname: order.shippingAddress.firstName,
            $lastname: order.shippingAddress.lastName,
            $mobile: order.shippingAddress.mobileNo,
            $email: finduser.email,
            $amount: order.totalAmount,
            $orderlink: orderlinkcustomer,
            $orderid: order.id,
            $seller: seller.companyName,
            $website: master.storeName,
            $delivereddate: deliveredDate,
          };
          const sms = await models.SiteContent.findOne({
            key: "orderDeliverysms",
          });
          const smsmessage = sms.content.split("#")[0];
          const sender_id = sms.content.split("#")[1];
          const temp_id = sms.content.split("#")[2];
          const apiUrl = "http://sms.bulkssms.com/submitsms.jsp";
          const user = "AGBCIN";
          const key = "87145d14eeXX";
          const mobile = `+91${order.shippingAddress.mobileNo}`;
          const message = smsmessage.replace(
            /\$\w+/g,
            (match) => params[match] || match
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
        // SMS End -------------------------------------------------------------------------------------

        // Whatsapp Start ----------------------------------------------------------------------------
        // Parameters of dynamic field: ["Customer Name","Website Name","Website Name"]},"buttons":[{"URL":{url}]
        if (master.whatsappAPINo) {
          const whatsappmessage = await models.SiteContent.findOne({
            key: "orderdeliverywhatsapp",
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
                          `${order.shippingAddress.firstName}`,
                          `${master.storeName}`,
                          `${master.storeName}`,
                        ],
                      },
                      buttons: [{ type: "URL", parameter: `${order.id}` }],
                    },
                    templateName: `${whatsappmessage.content}`,
                  },
                  from: `+91${master.whatsappAPINo}`,
                  to: `+91${order.shippingAddress.mobileNo}`,
                },
              ],
            })
            .then(({ data }) => console.log(data))
            .catch((err) => console.error(err));
        }
        // Whatsapp End   ..................................................

        return order;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  submutPaymentProof: authenticate(["customer"])(
    async (_, args, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const userCart = await models.Cart.findOne({ userId: user.id });

        const emaildata = await models.SiteContent.findOne({
          key: "dmtPaymentAdmin",
        });
        const emaildatasubject = await models.SiteContent.findOne({
          key: "dmtPaymentAdminsubject",
        });
        const master = await models.StoreFeature.findOne({});
        const result = await processFile(args.file);
        const responseData = {
          filename: result.uniqueFilename,
        };
        const filepath = process.env.BASE_URL + responseData.filename;

        const order = await models.Order.findById(args.orderId);
        order.paymentProof = filepath;
        order.paymentMethod = args.paymentMethod;
        order.paymentId = args.paymentId;
        order.paymentmode = args.paymentmode;
        order.paymentStatus = args.paymentStatus;
        userCart.cartProducts = [];
        await order.save();
        await userCart.save();
        const olink = `${process.env.FRONT_URL}/order/${args.orderId}`;
        const adminemail = await models.SiteContent.findOne({
          key: "adminEnquiryEmail",
        });
        const accemail = await models.SiteContent.findOne({
          key: "accountsEnquiryEmail",
        });
        const inputString = emaildata.content;
        const inputStringsubject = emaildatasubject.content;
        const params = {
          $firstname: order.shippingAddress.firstName,
          $lastname: order.shippingAddress.lastName,
          $mobile: order.shippingAddress.mobileNo,
          $paymentmode: args.paymentmode,
          $paymentid: args.paymentId,
          $orderlink: olink,
          $orderid: args.orderId,
          $email: user.email,
          $amount: order.totalAmount,
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
          to: user.email,
          cc: [adminemail.content, accemail.content],
          subject: modifiedsubject,
          html: modifiedString.replace(/<br>/g, ""),
        };
        await transporter.sendMail(mailOptions);

        // end mail
        return order;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  updatePaymentProofStatus: authenticate(["admin", "accounts"])(
    async (_, args, { models }) => {
      try {
        const order = await models.Order.findById(args.id);
        const users = await models.User.findById(order.user);
        const orderlinkcustomer = `${process.env.FRONT_URL}/order/${args.id}`;
        const orderlinkseller = `${process.env.FRONT_URL}/seller/order/detail?orderID=${args.id}`;
        const master = await models.StoreFeature.findOne({});
        const shippingDetails = `          
          ${order.shippingAddress.addressLine1}, 
          ${order.shippingAddress.addressLine2 || ""}, 
          ${order.shippingAddress.city}, 
          ${order.shippingAddress.state} - 
          ${order.shippingAddress.postalCode}
        `
          .replace(/\s+/g, " ")
          .trim();
        const createdAtDate = new Date(order.createdAt);
        const formattedDate = createdAtDate.toLocaleDateString("en-GB");
        const next10thDay = new Date();
        next10thDay.setDate(next10thDay.getDate() + 10);
        const formattedNext10thDay = next10thDay.toLocaleDateString("en-GB");
        let reasonforfailure = "";
        if (args.paymentfailedReason) {
          reasonforfailure = args.paymentfailedReason;
          // Start Email ------------------------------------------------------
          {
            const adminemail = await models.SiteContent.findOne({
              key: "adminEnquiryEmail",
            });
            const accemail = await models.SiteContent.findOne({
              key: "accountsEnquiryEmail",
            });
            const emaildata = await models.SiteContent.findOne({
              key: "buyRequestFailure",
            });
            const emaildatasubject = await models.SiteContent.findOne({
              key: "buyRequestFailuresubject",
            });
            const inputString = emaildata.content;
            const inputStringsubject = emaildatasubject.content;
            const params = {
              $firstname: users.firstName,
              $lastname: users.lastName,
              $mobile: users.mobileNo,
              $reason: args.paymentfailedReason,
              $paymentmode: args.paymentmode,
              $paymentid: args.paymentId,
              $orderlink: orderlinkcustomer,
              $email: users.email,
              $amount: order.totalAmount,
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
              to: users.email,
              cc: [adminemail.content, accemail.content],
              subject: modifiedsubject,
              html: modifiedString.replace(/<br>/g, ""),
            };
            await transporter.sendMail(mailOptions);
          }
          // End Email ----------------------------------------------------------------
        } else {
          for (const product of order.orderProducts) {
            const nestedProduct =
              (await models.Product.findById(product.productId)) ||
              (await models.SeriesProduct.findById(product.productId)) ||
              (await models.TMTSeriesProduct.findById(product.productId)) ||
              (await models.SuperSellerProduct.findById(product.productId));

            if (!nestedProduct) continue;
            const variant =
              nestedProduct.variant?.find(
                (v) => v._id.toString() === product.variantId.toString()
              ) ||
              nestedProduct.seriesvariant?.find(
                (v) => v._id.toString() === product.variantId.toString()
              ) ||
              nestedProduct.tmtseriesvariant?.find(
                (v) => v._id.toString() === product.variantId.toString()
              ) ||
              nestedProduct.supervariant?.find(
                (v) => v._id.toString() === product.variantId.toString()
              );

            if (!variant) continue;
            const location =
              variant.location?.find(
                (l) => l._id.toString() === product.locationId.toString()
              ) ||
              variant.serieslocation?.find(
                (l) => l._id.toString() === product.locationId.toString()
              ) ||
              variant.tmtserieslocation?.find(
                (l) => l._id.toString() === product.locationId.toString()
              ) ||
              variant.superlocation?.find(
                (l) => l._id.toString() === product.locationId.toString()
              );
            if (!location) continue;
            location.mainStock -= product.quantity;
            await nestedProduct.save();
          }
          // Send email DMT payment success by portal admin
          {
            const emaildata = await models.SiteContent.findOne({
              key: "buyRequestProof",
            });
            const emaildatasubject = await models.SiteContent.findOne({
              key: "buyRequestProofsubject",
            });
            const adminemail = await models.SiteContent.findOne({
              key: "adminEnquiryEmail",
            });
            const accemail = await models.SiteContent.findOne({
              key: "accountsEnquiryEmail",
            });
            const inputString = emaildata.content;
            const inputStringsubject = emaildatasubject.content;
            const params = {
              $firstname: order.shippingAddress.firstName,
              $lastname: order.shippingAddress.lastName,
              $mobile: order.shippingAddress.mobileNo,
              $paymentmode: order.paymentmode,
              $paymentid: order.paymentId,
              $orderlink: orderlinkcustomer,
              $orderid: args.id,
              $email: users.email,
              $amount: order.totalAmount,
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
              to: users.email,
              cc: [adminemail.content, accemail.content],
              subject: modifiedsubject,
              html: modifiedString.replace(/<br>/g, ""),
            };
            await transporter.sendMail(mailOptions);
          }
          // End email ---------------------------------------------------

          // SMS Start (DMD Order success by Accounts admin/Site admin.) -----------------
          // {
          //   const params = {
          //     $firstname: order.shippingAddress.firstName,
          //     $lastname: order.shippingAddress.lastName,
          //     $mobile: order.shippingAddress.mobileNo,
          //     $paymentmode: order.paymentmode,
          //     $paymentid: order.paymentId,
          //     $orderlink: orderlinkcustomer,
          //     $orderid: args.id,
          //     $email: users.email,
          //     $amount: order.totalAmount,
          //     $website: master.storeName,
          //   };
          //   const sms = await models.SiteContent.findOne({
          //     key: "ordersuccesssms",
          //   });
          //   const smsmessage = sms.content.split("#")[0];
          //   const sender_id = sms.content.split("#")[1];
          //   const temp_id = sms.content.split("#")[2];
          //   const apiUrl = "http://sms.bulkssms.com/submitsms.jsp";
          //   const user = "AGBCIN";
          //   const key = "87145d14eeXX";
          //   const mobile = `+91${order.shippingAddress.mobileNo}`;
          //   const message = smsmessage.replace(
          //     /\$\w+/g,
          //     (match) => params[match] || match
          //   );
          //   const senderid = sender_id;
          //   const accusage = "1";
          //   const entityid = "1501578910000051328";
          //   const tempid = temp_id;
          //   const param = new URLSearchParams({
          //     user,
          //     key,
          //     mobile,
          //     message,
          //     senderid,
          //     accusage,
          //     entityid,
          //     tempid,
          //   });
          //   axios
          //     .get(apiUrl, { params: param })
          //     .then((response) => {
          //       console.log("API Response:", response.data);
          //     })
          //     .catch((error) => {
          //       console.error("Error:", error);
          //     });
          // }
          // SMS End -----------------------------------------------------

          // Whatsapp Start ..................................................
          // Parameters of dynamic field:"Customer Name","Order ID","Order Date","Expected Delivery Date","Order Amount","Customer Name","Delivery Address","Mobile No","Website Name","Website Name"]},"buttons":{url}
          {
            if (master.whatsappAPINo) {
              const whatsappmessage = await models.SiteContent.findOne({
                key: "ordersuccessWhatsappapi",
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
                              `${order.shippingAddress.firstName}`,
                              `${args.id}`,
                              `${formattedDate}`,
                              `${formattedNext10thDay}`,
                              `${order.totalAmount}`,
                              `${order.shippingAddress.firstName}`,
                              `${shippingDetails}`,
                              `${order.shippingAddress.mobileNo}`,
                              `${master.storeName}`,
                              `${master.storeName}`,
                            ],
                          },
                          buttons: [{ type: "URL", parameter: `${args.id}` }],
                        },
                        templateName: `${whatsappmessage.content}`,
                      },
                      from: `+91${master.whatsappAPINo}`,
                      to: `+91${order.shippingAddress.mobileNo}`,
                    },
                  ],
                })
                .then(({ data }) => console.log(data))
                .catch((err) => console.error(err));
            }
          }
          // Whatsapp End   ..................................................

          const uniqueReffers = new Set();
          const newArray = [];
          for (const obj of order.orderProducts) {
            if (!uniqueReffers.has(obj.sellerId)) {
              uniqueReffers.add(obj.sellerId);
              newArray.push(obj);
            }
          }
          // Email and SMS send only for seller
          for (const product of newArray) {
            const sellermail = await models.Seller.findById(product.sellerId);
            // Send Email --------------------------------------------------------
            {
              const emaildata = await models.SiteContent.findOne({
                key: "buyRequestReceipt",
              });
              const emaildatasubject = await models.SiteContent.findOne({
                key: "buyRequestReceiptsubject",
              });
              const inputString = emaildata.content;
              const inputStringsubject = emaildatasubject.content;
              const paramss = {
                $firstname: order.shippingAddress.firstName,
                $lastname: order.shippingAddress.lastName,
                $mobile: order.shippingAddress.mobileNo,
                $email: users.email,
                $orderid: args.id,
                $orderlink: orderlinkseller,
                $address1: order.shippingAddress.addressLine1,
                $address2: order.shippingAddress.addressLine2,
                $city: order.shippingAddress.city,
                $state: order.shippingAddress.state,
                $company: sellermail.companyName,
                $companyMobileNo: sellermail.mobileNo,
                $pincode: order.shippingAddress.postalCode,
                $website: master.storeName,
              };
              const subject = inputStringsubject;
              const modifiedsubject = subject.replace(
                /\$\w+/g,
                (match) => paramss[match] || match
              );
              const modifiedString = inputString.replace(
                /\$\w+/g,
                (match) => paramss[match] || match
              );
              const mailOptions = {
                from: process.env.SMTP_USER,
                to: sellermail.email,
                subject: modifiedsubject,
                html: modifiedString.replace(/<br>/g, ""),
              };
              await transporter.sendMail(mailOptions);
            }
            // End email ----------------------------------------------------------

            // SMS Start (Seller Order Received SMS )
            // const sms = await models.SiteContent.findOne({
            //   key: "ordersuccesssellersms",
            // });

            // const smsmessage = sms.content.split("#")[0];
            // const sender_id = sms.content.split("#")[1];
            // const temp_id = sms.content.split("#")[2];

            // const apiUrl = "http://sms.bulkssms.com/submitsms.jsp";
            // const user = "AGBCIN";
            // const key = "87145d14eeXX";
            // const mobile = `+91${sellermail.mobileNo}`;
            // const message = smsmessage.replace(
            //   /\$\w+/g,
            //   (match) => params[match] || match
            // );
            // const senderid = sender_id;
            // const accusage = "1";
            // const entityid = "1501578910000051328";
            // const tempid = temp_id;

            // const param = new URLSearchParams({
            //   user,
            //   key,
            //   mobile,
            //   message,
            //   senderid,
            //   accusage,
            //   entityid,
            //   tempid,
            // });

            // axios
            //   .get(apiUrl, { params: param })
            //   .then((response) => {
            //     console.log("API Response:", response.data);
            //   })
            //   .catch((error) => {
            //     console.error("Error:", error);
            //   });

            // SMS End
          }
        }
        const updatedOrder = await models.Order.findByIdAndUpdate(
          args.id,
          {
            paymentStatus: args.paymentStatus,
            paymentfailedReason: reasonforfailure,
            status: args.paymentStatus === "failed" ? "failed" : "pending",
          },
          { new: true }
        );
        return updatedOrder;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  updateSellerId: authenticate(["admin"])(
    async (_, { id, sellerId }, { models, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const seller = await models.Seller.findOne({ user: decoded._id });
        const order = await models.Order.findById(id);
        for (const product of order.orderProducts) {
          const superSellerProduct = await models.SuperSellerProduct.findOne({
            _id: product.productId,
            "supervariant.superlocation.sellerId": seller.id,
          });
          if (superSellerProduct) {
            product.sellerId = sellerId;
          }
        }
        await order.save();
        return order;
      } catch (error) {
        console.log(error);
        throw new Error(error);
      }
    }
  ),

  updateOrder: authenticate(["admin"])(async (_, args, { models }) => {
    try {
      const updatedOrder = await models.Order.findByIdAndUpdate(
        args.id,
        {
          paymentMethod: args.paymentMethod,
          totalAmount: args.totalAmount,
          orderProducts: args.orderProducts,
          shippingAddress: args.shippingAddress,
          billingAddress: args.billingAddress,
          freeDelivery: args.freeDelivery,
          status: args.status,
        },
        { new: true }
      );
      return updatedOrder;
    } catch (error) {
      throw new Error(error);
    }
  }),

  cancelOrder: async (_, args, { models }) => {
    try {
      const master = await models.StoreFeature.findOne({});
      const order = await models.Order.findById(args.id);
      const users = await models.User.findById(order.user);

      var myDateString = new Date();

      if (!order) {
        throw new Error("Order not found");
      }
      order.status = "cancelled";
      order.orderCancelledReason = args.orderCancelledReason;
      order.orderCancelledDate = myDateString;
      const result = await order.save();
      // Send Email --------------------------------------------------------
      {
        const customerEmailTemplate = await models.SiteContent.findOne({
          key: "orderCancel",
        });
        const customerSubjectTemplate = await models.SiteContent.findOne({
          key: "orderCancelsubject",
        });
        const sellerEmailTemplate = await models.SiteContent.findOne({
          key: "orderCancelSeller",
        });
        const sellerSubjectTemplate = await models.SiteContent.findOne({
          key: "orderCancelSellersubject",
        });
        const adminemail = await models.SiteContent.findOne({
          key: "adminEnquiryEmail",
        });
        const accemail = await models.SiteContent.findOne({
          key: "accountsEnquiryEmail",
        });
        const customerSubjectTemplates = customerSubjectTemplate.content;
        const formatDate = (date) => {
          return new Date(date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        };
        const orderlinkcustomer = `${process.env.FRONT_URL}/order/${args.id}`;
        const orderlinkseller = `${process.env.FRONT_URL}/seller/order/detail?orderID=${args.id}`;
        const paramss = {
          $firstname: order.shippingAddress.firstName,
          $mobile: order.shippingAddress.mobileNo,
          $orderid: args.id,
          $amount: order.totalAmount,
          $orderdate: formatDate(order.createdAt),
          $canceldate: formatDate(order.orderCancelledDate),
          $reason: args.orderCancelledReason,
          $website: master.storeName,
          $orderlinkcustomer: orderlinkcustomer,
          $orderlinkseller: orderlinkseller,
        };
        const customerSubject = customerSubjectTemplates.replace(
          /\$\w+/g,
          (match) => paramss[match] || match
        );
        const customerHtml = customerEmailTemplate.content.replace(
          /\$\w+/g,
          (match) => paramss[match] || match
        );
        const sellerSubject = sellerSubjectTemplate.content.replace(
          /\$\w+/g,
          (match) => paramss[match] || match
        );
        const sellerHtml = sellerEmailTemplate.content.replace(
          /\$\w+/g,
          (match) => paramss[match] || match
        );
        const customerEmail = users.email;
        const mailOptions = {
          from: process.env.SMTP_USER,
          to: customerEmail,
          cc: [adminemail.content, accemail.content],
          subject: customerSubject,
          html: customerHtml.replace(/<br>/g, ""),
        };
        const emailedSellers = new Set();
        for (const seller of order.orderProducts) {
          const sellerDetail = await models.Seller.findById(seller.sellerId);
          const sellerEmail = sellerDetail.email;

          if (emailedSellers.has(sellerEmail)) {
            continue;
          }

          const mailOptions = {
            from: process.env.SMTP_USER,
            to: sellerEmail,
            cc: [adminemail.content, accemail.content],
            subject: sellerSubject,
            html: sellerHtml.replace(/<br>/g, ""),
          };

          await transporter.sendMail(mailOptions);
          emailedSellers.add(sellerEmail);
        }
        await transporter.sendMail(mailOptions);
      }
      // End email ----------------------------------------------------------
      return result;
    } catch (error) {
      throw new Error(error);
    }
  },

  deleteOrder: authenticate(["admin"])(async (_, { id }, { models }) => {
    try {
      // await deleteChildren(id);
      const deletedOrder = await models.Order.findByIdAndRemove(id);
      return deletedOrder;
    } catch (error) {
      throw new Error(error);
    }
  }),
};

export const Order = {
  // shippingAddress: async (order, _, { models }) => {
  //   try {
  //     return await models.Address.findById(order.shippingAddress);
  //   } catch (error) {
  //     throw new Error(error);
  //   }
  // },
  // billingAddress: async (order, _, { models }) => {
  //   try {
  //     return await models.Address.findById(order.billingAddress);
  //   } catch (error) {
  //     throw new Error(error);
  //   }
  // },
  user: async (order, _, { models }) => {
    try {
      const user = await models.User.findById(order.user);
      return user;
    } catch (error) {
      throw new Error(error);
    }
  },
};
export const OrderProduct = {
  productId: async (orderProducts, _, { models }) => {
    try {
      const product =
        (await models.Product.findById(orderProducts.productId)) ||
        (await models.SeriesProduct.findById(orderProducts.productId)) ||
        (await models.TMTSeriesProduct.findById(orderProducts.productId)) ||
        (await models.SuperSellerProduct.findById(orderProducts.productId));

      return product;
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch product");
    }
  },
  variantId: async (orderProducts, _, { models }) => {
    try {
      const product =
        (await models.Product.findById(orderProducts.productId)) ||
        (await models.SeriesProduct.findById(orderProducts.productId)) ||
        (await models.TMTSeriesProduct.findById(orderProducts.productId)) ||
        (await models.SuperSellerProduct.findById(orderProducts.productId));

      if (!product) return null;

      const variant =
        product.variant?.find(
          (v) => v._id.toString() === orderProducts.variantId.toString()
        ) ||
        product.seriesvariant?.find(
          (v) => v._id.toString() === orderProducts.variantId.toString()
        ) ||
        product.tmtseriesvariant?.find(
          (v) => v._id.toString() === orderProducts.variantId.toString()
        ) ||
        product.supervariant?.find(
          (v) => v._id.toString() === orderProducts.variantId.toString()
        );

      return variant || null;
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch variant");
    }
  },
  locationId: async (orderProducts, _, { models }) => {
    try {
      const product =
        (await models.Product.findById(orderProducts.productId)) ||
        (await models.SeriesProduct.findById(orderProducts.productId)) ||
        (await models.TMTSeriesProduct.findById(orderProducts.productId)) ||
        (await models.SuperSellerProduct.findById(orderProducts.productId));

      if (!product) return null;

      const variant =
        product.variant?.find(
          (v) => v._id.toString() === orderProducts.variantId.toString()
        ) ||
        product.seriesvariant?.find(
          (v) => v._id.toString() === orderProducts.variantId.toString()
        ) ||
        product.tmtseriesvariant?.find(
          (v) => v._id.toString() === orderProducts.variantId.toString()
        ) ||
        product.supervariant?.find(
          (v) => v._id.toString() === orderProducts.variantId.toString()
        );

      if (!variant) return null;

      const location =
        variant.location?.find(
          (l) => l._id.toString() === orderProducts.locationId.toString()
        ) ||
        variant.serieslocation?.find(
          (l) => l._id.toString() === orderProducts.locationId.toString()
        ) ||
        variant.tmtserieslocation?.find(
          (l) => l._id.toString() === orderProducts.locationId.toString()
        ) ||
        variant.superlocation?.find(
          (l) => l._id.toString() === orderProducts.locationId.toString()
        );

      return location || null;
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch location");
    }
  },

  sellerId: async (orderProducts, _, { models }) => {
    try {
      const seller = await models.Seller.findById(orderProducts.sellerId);
      return seller;
    } catch (error) {
      throw new Error("Failed to fetch seller");
    }
  },
};
