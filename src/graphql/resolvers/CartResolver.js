// src/graphql/resolvers/CartResolver.js
import authenticate from "../../middlewares/auth.js";
import jwt from "jsonwebtoken";
import Product from "../../models/Product.js";
import SeriesProduct from "../../models/SeriesProduct.js";
import TMTSeriesProduct from "../../models/TMTSeriesProduct.js";
import StoreFeature from "../../models/StoreFeature.js";
import crypto from "crypto";
import fetch from "node-fetch";
import { URLSearchParams } from "url";
import nodemailer from "nodemailer";
import { model } from "mongoose";

/* ------------------------------------------------------------------ */
/* ------------------------- EMAIL ---------------------------------- */
/* ------------------------------------------------------------------ */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* ------------------------------------------------------------------ */
/* ------------------------- QUERY ---------------------------------- */
/* ------------------------------------------------------------------ */

export const Query = {
  cart: authenticate(["admin", "customer"])(async (_, __, { models, req }) => {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await models.User.findById(decoded._id);
    return await models.Cart.findOne({ userId: user._id });
  }),
  getAllCarts: authenticate(["admin"])(
    async (_, { search, limit = 20, offset = 0 }, { models }) => {
      try {
        const query = {};
        if (search) {
          const regex = new RegExp("^" + search, "i");
          query.$or = [{ "cartProducts.productName": regex }];
        }

        const carts = await models.Cart.find(query)
          .populate("userId", "firstName mobileNo email")
          .sort({ updatedAt: -1 })
          .limit(limit)
          .skip(offset)
          .lean();

        return carts.map((cart) => ({
          ...cart,
          id: cart._id.toString(),
        }));
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),
};

export const CartProduct = {
  productId: async (cartProduct, _, { models }) => {
    try {
      const product = await models.Product.findById(cartProduct.productId);
      if (!product) {
        const seriesProduct = await models.SeriesProduct.findById(
          cartProduct.productId
        );
        if (!seriesProduct) {
          const tmtseriesProduct = await models.TMTSeriesProduct.findById(
            cartProduct.productId
          );
          if (!tmtseriesProduct) {
            const superProduct = await models.SuperSellerProduct.findById(
              cartProduct.productId
            );
            return superProduct;
          } else {
            return tmtseriesProduct;
          }
        } else {
          return seriesProduct;
        }
      } else {
        return product;
      }
    } catch (error) {
      console.error(error);

      throw new Error("Failed to fetch product");
    }
  },
  variantId: async (cartProduct, _, { models }) => {
    try {
      const product = await models.Product.findById(cartProduct.productId);
      if (!product) {
        const seriesProduct = await models.SeriesProduct.findById(
          cartProduct.productId
        );
        if (!seriesProduct) {
          const tmtseriesProduct = await models.TMTSeriesProduct.findById(
            cartProduct.productId
          );
          if (!tmtseriesProduct) {
            const superProduct = await models.SuperSellerProduct.findById(
              cartProduct.productId
            );

            const supervariant = superProduct.supervariant.find(
              (obj) => obj._id.toString() === cartProduct.variantId.toString()
            );
            return supervariant;
          } else {
            const tmtseriesvariant = tmtseriesProduct.tmtseriesvariant.find(
              (obj) => obj._id.toString() === cartProduct.variantId.toString()
            );
            return tmtseriesvariant;
          }
        } else {
          const seriesvariant = seriesProduct.seriesvariant.find(
            (obj) => obj._id.toString() === cartProduct.variantId.toString()
          );
          return seriesvariant;
        }
      } else {
        const variant = product.variant.find(
          (obj) => obj._id.toString() === cartProduct.variantId.toString()
        );
        return variant;
      }
    } catch (error) {
      console.error(error);

      throw new Error("Failed to fetch product");
    }
  },
  locationId: async (cartProduct, _, { models }) => {
    try {
      const product = await models.Product.findById(cartProduct.productId);
      if (!product) {
        const seriesProduct = await models.SeriesProduct.findById(
          cartProduct.productId
        );
        if (!seriesProduct) {
          const tmtseriesProduct = await models.TMTSeriesProduct.findById(
            cartProduct.productId
          );
          if (!tmtseriesProduct) {
            const superProduct = await models.SuperSellerProduct.findById(
              cartProduct.productId
            );
            const supervariant = superProduct.supervariant.find(
              (obj) => obj._id.toString() === cartProduct.variantId.toString()
            );
            const superlocation = supervariant.superlocation.find(
              (obj) => obj._id.toString() === cartProduct.locationId.toString()
            );
            return superlocation;
          } else {
            const tmtseriesvariant = tmtseriesProduct.tmtseriesvariant.find(
              (obj) => obj._id.toString() === cartProduct.variantId.toString()
            );
            const tmtseriesloaction = tmtseriesvariant.tmtserieslocation.find(
              (obj) => obj._id.toString() === cartProduct.locationId.toString()
            );
            return tmtseriesloaction;
          }
        } else {
          const seriesvariant = seriesProduct.seriesvariant.find(
            (obj) => obj._id.toString() === cartProduct.variantId.toString()
          );
          const seriesloaction = seriesvariant.serieslocation.find(
            (obj) => obj._id.toString() === cartProduct.locationId.toString()
          );
          return seriesloaction;
        }
      } else {
        const variant = product.variant.find(
          (obj) => obj._id.toString() === cartProduct.variantId.toString()
        );
        const location = variant.location.find(
          (obj) => obj._id.toString() === cartProduct.locationId.toString()
        );
        return location;
      }
    } catch (error) {
      console.error(error);

      throw new Error("Failed to fetch product");
    }
  },
};

/* ------------------------------------------------------------------ */
/* ------------------------- MUTATION -------------------------------- */
/* ------------------------------------------------------------------ */

export const Mutation = {
  addToCart: authenticate(["admin", "customer"])(
    async (_, { cartinput }, { models, pubsub, req }) => {
      try {
        console.log("cartinput ppp:");

        // Extract token and decode user
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);

        // Find or create cart
        let cart = await models.Cart.findOne({ userId: user._id });
        if (!cart) {
          cart = new models.Cart({
            userId: user._id,
            cartProducts: [],
          });
        }

        const cartProducts = cart.cartProducts || [];

        // For each input product, remove old and add new
        cartinput.forEach((product) => {
          // Remove existing product with same variantId
          const index = cartProducts.findIndex(
            (item) => item.variantId.toString() === product.variantId
          );

          if (index !== -1) {
            cartProducts.splice(index, 1); // Remove old product
          }

          // Push new product with updated quantity
          cartProducts.push(product);
        });

        // Update and save cart
        cart.cartProducts = cartProducts;
        await cart.save();

        // Notify cart update
        pubsub.publish("CART_UPDATED", { cartUpdated: cart });

        return cart;
      } catch (error) {
        console.error(error);
        throw new Error("Failed to add product to cart");
      }
    }
  ),

  removeFromCart: authenticate(["admin", "customer"])(
    async (_, { variantId }, { models, pubsub, req }) => {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded._id);
        const cart = await models.Cart.findOne({ userId: user._id });
        if (!cart) {
          throw new Error("Cart not found");
        }
        const cartProducts = cart.cartProducts || [];
        const productIndex = cartProducts.findIndex(
          (product) => product.variantId.toString() === variantId
        );

        if (productIndex === -1) {
          throw new Error("Product not found in cart");
        }
        cartProducts.splice(productIndex, 1);
        cart.cartProducts = cartProducts;
        await cart.save();
        pubsub.publish("CART_UPDATED", { cartUpdated: cart });
        return cart;
      } catch (error) {
        console.error(error);
        throw new Error("Failed to remove product from cart");
      }
    }
  ),

  makePayment: async (_, args, { models, req }) => {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await models.User.findById(decoded._id);
      const master = await models.StoreFeature.findOne({});
      const endpoint = "https://secure.payu.in/_payment";
      // const endpoint = "https://test.payu.in/_payment";
      const merchantKey = master.key;
      const salt = master.solt;
      const payload = {
        key: merchantKey,
        txnid: args.orderId,
        amount: args.amount,
        productinfo: "Product Information",
        firstname: args.firstname,
        email: args.email,
        phone: args.phone,
        surl: process.env.SURL,
        furl: process.env.FURL,
      };
      const hashString =
        merchantKey +
        "|" +
        payload.txnid +
        "|" +
        payload.amount +
        "|" +
        payload.productinfo +
        "|" +
        payload.firstname +
        "|" +
        payload.email +
        "|||||||||||" +
        salt;
      const hash = crypto.createHash("sha512").update(hashString).digest("hex");
      payload.hash = hash;
      const encodedParams = new URLSearchParams();
      encodedParams.set("key", payload.key);
      encodedParams.set("amount", payload.amount);
      encodedParams.set("txnid", payload.txnid);
      encodedParams.set("firstname", payload.firstname);
      encodedParams.set("email", payload.email);
      encodedParams.set("phone", payload.phone);
      encodedParams.set("productinfo", payload.productinfo);
      encodedParams.set("surl", `${process.env.SURL}/${payload.txnid}`);
      encodedParams.set("furl", `${process.env.SURL}/${payload.txnid}`);
      encodedParams.set("hash", payload.hash);
      const options = {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: encodedParams,
      };
      const response = await fetch(endpoint, options);

      return {
        success: true,
        message: "Payment created successfully",
        redirectUrl: response.url,
      };
    } catch (error) {
      throw new Error("Failed to make payment: " + error.message);
    }
  },

  handlePaymentResponse: async (_, { txn }, { models, req }) => {
    try {
      const order = await models.Order.findById(txn);
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const users = await models.User.findById(decoded._id);
      const userCart = await models.Cart.findOne({ userId: users.id });
      const master = await models.StoreFeature.findOne({});
      if (!order) {
        throw new Error("Transacation ID not found");
      }
      const verify_payment = "verify_payment";
      const endpoint = "https://info.payu.in/merchant/postservice?form=2";
      // const endpoint = "https://test.payu.in/merchant/postservice.php?form=2";
      const merchantKey = master.key;
      const salt = master.solt;
      const hashString1 =
        merchantKey + "|" + verify_payment + "|" + txn + "|" + salt;
      const hash1 = crypto
        .createHash("sha512")
        .update(hashString1)
        .digest("hex");
      const encodedParams = new URLSearchParams();
      encodedParams.set("key", merchantKey);
      encodedParams.set("command", verify_payment);
      encodedParams.set("var1", txn);
      encodedParams.set("hash", hash1);
      const options = {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: encodedParams,
      };
      const response = await fetch(endpoint, options);
      const json = await response.json();

      if (json) {
        order.paymentGatewayResponse = JSON.stringify(json);
      }
      if (json.transaction_details[txn].status === "success") {
        // Payment is successful
        order.onlinepaymentStatus = json.transaction_details[txn].status;
        for (const product of order.orderProducts) {
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
              const tmtseriesvariant =
                tmtseriesnestedProduct.tmtseriesvariant.find(
                  (obj) => obj._id.toString() === product.variantId.toString()
                );
              const tmtseriesloaction = tmtseriesvariant.tmtserieslocation.find(
                (obj) => obj._id.toString() === product.locationId.toString()
              );
              tmtseriesloaction.mainStock -= product.quantity;
              tmtseriesnestedProduct.save();
            }
            const seriesvariant = seriesnestedProduct.seriesvariant.find(
              (obj) => obj._id.toString() === product.variantId.toString()
            );
            const seriesloaction = seriesvariant.serieslocation.find(
              (obj) => obj._id.toString() === product.locationId.toString()
            );
            seriesloaction.mainStock -= product.quantity;
            seriesnestedProduct.save();
          }
          const variant = nestedProduct.variant.find(
            (obj) => obj._id.toString() === product.variantId.toString()
          );
          const location = variant.location.find(
            (obj) => obj._id.toString() === product.locationId.toString()
          );
          location.mainStock -= product.quantity;
          nestedProduct.save();
        }
        userCart.cartProducts = [];
        order.paymentStatus = "complete";
        await order.save();
        await userCart.save();

        // Send Email
        const emaildata = await models.SiteContent.findOne({
          key: "onlineOrderSuccess",
        });
        const emailsubject = await models.SiteContent.findOne({
          key: "onlineOrderSuccesssubject",
        });
        const adminemail = await models.SiteContent.findOne({
          key: "adminEnquiryEmail",
        });
        const accemail = await models.SiteContent.findOne({
          key: "accountsEnquiryEmail",
        });

        const master = await models.StoreFeature.findOne({});
        const olink = `${process.env.FRONT_URL}/order/${txn}`;
        const inputString = emaildata.content;
        const inputSubject = emailsubject.content;
        const params = {
          $firstname: order.shippingAddress.firstName,
          $lastname: order.shippingAddress.lastName,
          $mobile: order.shippingAddress.mobileNo,
          $email: users.email,
          $orderid: txn,
          $orderlink: olink,
          $address1: order.shippingAddress.addressLine1,
          $address2: order.shippingAddress.addressLine2,
          $city: order.shippingAddress.city,
          $state: order.shippingAddress.state,
          $pincode: order.shippingAddress.postalCode,
          $amount: order.totalAmount,
          $website: master.storeName,
        };
        const subject = inputSubject;
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

        // end mail

        const uniqueReffers = new Set();
        const newArray = [];

        for (const obj of order.orderProducts) {
          if (!uniqueReffers.has(obj.sellerId)) {
            uniqueReffers.add(obj.sellerId);
            newArray.push(obj);
          }
        }

        for (const product of newArray) {
          const sellermail = await models.Seller.findById(product.sellerId);

          // send email
          const emaildata = await models.SiteContent.findOne({
            key: "orderSuccess",
          });
          const emaildatasubject = await models.SiteContent.findOne({
            key: "orderSuccesssubject",
          });
          const master = await models.StoreFeature.findOne({});
          const olink = `${process.env.FRONT_URL}/seller/order/detail?orderID=${txn}`;
          const inputString = emaildata.content;
          const inputStringsubject = emaildatasubject.content;
          const params = {
            $firstname: order.shippingAddress.firstName,
            $lastname: order.shippingAddress.lastName,
            $mobile: order.shippingAddress.mobileNo,
            $email: users.email,
            $orderid: txn,
            $orderlink: olink,
            $address1: order.shippingAddress.addressLine1,
            $address2: order.shippingAddress.addressLine2,
            $city: order.shippingAddress.city,
            $state: order.shippingAddress.state,
            $company: sellermail.companyName,
            $pincode: order.shippingAddress.postalCode,
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
            to: sellermail.email,
            // cc: [adminemail.content, accemail.content],
            subject: modifiedsubject,
            html: modifiedString.replace(/<br>/g, ""),
          };
          await transporter.sendMail(mailOptions);

          // end mail
        }

        return {
          success: true,
          message: "Payment successfully",
        };
      } else {
        order.onlinepaymentStatus = json.transaction_details[txn].status;
        order.status = "cancelled";
        await order.save();
        // send email
        const emaildata = await models.SiteContent.findOne({
          key: "Onlinepaymentfailed",
        });
        const emailsubject = await models.SiteContent.findOne({
          key: "Onlinepaymentfailedsubject",
        });
        const adminemail = await models.SiteContent.findOne({
          key: "adminEnquiryEmail",
        });

        const master = await models.StoreFeature.findOne({});
        const olink = `${process.env.FRONT_URL}/order/${txn}`;
        const inputString = emaildata.content;
        const inputemailsubject = emailsubject.content;
        const params = {
          $firstname: order.shippingAddress.firstName,
          $lastname: order.shippingAddress.lastName,
          $mobile: order.shippingAddress.mobileNo,
          $email: users.email,
          $orderid: txn,
          $orderlink: olink,
          $address1: order.shippingAddress.addressLine1,
          $address2: order.shippingAddress.addressLine2,
          $city: order.shippingAddress.city,
          $state: order.shippingAddress.state,
          $pincode: order.shippingAddress.postalCode,
          $amount: order.totalAmount,
          $website: master.storeName,
        };
        const subject = inputemailsubject;
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
          cc: [adminemail.content],
          subject: modifiedsubject,
          html: modifiedString.replace(/<br>/g, ""),
        };
        await transporter.sendMail(mailOptions);

        // end mail
        return {
          success: false,
          message: json.transaction_details[txn].error_Message,
        };
      }
    } catch (error) {
      throw new Error("Failed to make payment: " + error.message);
    }
  },
};

/* ------------------------------------------------------------------ */
/* ----------------------- SUBSCRIPTION ------------------------------ */
/* ------------------------------------------------------------------ */

export const Subscription = {
  cartUpdated: {
    resolve: async (payload, _, { models }) => {
      try {
        const { cartUpdated } = payload;
        const { id, userId, cartProducts } = cartUpdated;
        const enrichedCartProducts = await Promise.all(
          cartProducts.map(async (product) => {
            try {
              const nestedProduct = await Product.findById(product.productId);

              if (!nestedProduct) {
                const seriesnestedProduct = await SeriesProduct.findById(
                  product.productId
                );

                if (!seriesnestedProduct) {
                  const tmtseriesnestedProduct =
                    await TMTSeriesProduct.findById(product.productId);
                  const tmtseriesvariant =
                    tmtseriesnestedProduct.tmtseriesvariant.find(
                      (obj) =>
                        obj._id.toString() === product.variantId.toString()
                    );
                  const tmtseriesloaction =
                    tmtseriesvariant.tmtserieslocation.find(
                      (obj) =>
                        obj._id.toString() === product.locationId.toString()
                    );
                  return {
                    ...product._doc,
                    locationId: tmtseriesloaction,
                    variantId: tmtseriesvariant,
                    productId: tmtseriesnestedProduct,
                  };
                }
                const seriesvariant = seriesnestedProduct.seriesvariant.find(
                  (obj) => obj._id.toString() === product.variantId.toString()
                );
                const seriesloaction = seriesvariant.serieslocation.find(
                  (obj) => obj._id.toString() === product.locationId.toString()
                );
                return {
                  ...product._doc,
                  locationId: seriesloaction,
                  variantId: seriesvariant,
                  productId: seriesnestedProduct,
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
                locationId: location,
                variantId: variant,
                productId: nestedProduct,
              };
            } catch (error) {
              console.error(error);
              throw new Error(error);
            }
          })
        );

        const updatedCart = {
          id,
          userId,
          cartProducts: enrichedCartProducts,
        };

        return updatedCart;
      } catch (error) {
        console.error(error);
        throw new Error("Failed to resolve cartUpdated subscription");
      }
    },
    subscribe: (_, __, { pubsub }) => pubsub.asyncIterator("CART_UPDATED"),
  },
};
