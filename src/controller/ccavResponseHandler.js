import authenticate from "../middlewares/auth.js";
import { decrypt } from "../middlewares/ccavutil.js";
import { parse } from "querystring";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import nodemailer from "nodemailer";
import doubletick from "@api/doubletick";
import Product from "../models/Product.js";
import SeriesProduct from "../models/SeriesProduct.js";
import TMTSeriesProduct from "../models/TMTSeriesProduct.js";
import SiteContent from "../models/SiteContent.js";
import StoreFeature from "../models/StoreFeature.js";
import User from "../models/User.js";
// Configure the nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function postRes(request, response) {
  let ccavEncResponse = "";
  let ccavResponse = "";
  const master = await StoreFeature.findOne({});
  // const workingKey = "C5CFD3B69271F983E81D60E47B6135E7"; // Put in the 32-Bit key shared by CCAvenues.
  const workingKey = master.ccKey; // Put in the 32-Bit key shared by CCAvenues.
  let ccavPOST = "";

  // Wrap the function in a Promise to handle asynchronous behavior
  return new Promise((resolve, reject) => {
    request.on("data", function (data) {
      ccavEncResponse += data;
      ccavPOST = parse(ccavEncResponse);
      const encryption = ccavPOST.encResp;
      ccavResponse = decrypt(encryption, workingKey);
    });

    request.on("end", async function () {
      try {
        function convertResponseToJSON(responseString) {
          const keyValuePairs = responseString.split("&");
          const result = {};
          keyValuePairs.forEach((pair) => {
            const [key, value] = pair.split("=");
            result[key] = decodeURIComponent(value.replace(/\+/g, " "));
          });
          return result;
        }
        
        const jsonResponse = convertResponseToJSON(ccavResponse);
        var jsonString = JSON.stringify(jsonResponse);
        const order = await Order.findById(jsonResponse.order_id);
        const users = await User.findById(order.user);
        const userCart = await Cart.findOne({ userId: order.user });
        const master = await StoreFeature.findOne({});
        if (jsonResponse.order_status === "Success") {
          order.onlinepaymentStatus = jsonResponse.order_status.toLowerCase();
          order.paymentStatus = "complete";
          order.paymentGatewayResponse =
            '{"status":1,"msg":"' +
            jsonResponse.status_message +
            '","transaction_details":{"' +
            jsonResponse.order_id +
            '":{"mihpayid":"' +
            jsonResponse.tracking_id +
            '","amt":"' +
            jsonResponse.amount +
            '","transaction_amount":"' +
            jsonResponse.mer_amount +
            '","txnid":"' +
            jsonResponse.order_id +
            '","addedon":"' +
            jsonResponse.trans_date +
            '","payment_source":"ccavenue","mode":"' +
            jsonResponse.payment_mode +
            '","bankcode":"' +
            jsonResponse.payment_mode +
            '","status":"' +
            order.onlinepaymentStatus +
            '"}}}';
          // product stock update ------ start
          for (const product of order.orderProducts) {
            const nestedProduct = await Product.findById(product.productId);
            if (!nestedProduct) {
              const seriesnestedProduct = await SeriesProduct.findById(
                product.productId
              );
              if (!seriesnestedProduct) {
                const tmtseriesnestedProduct = await TMTSeriesProduct.findById(
                  product.productId
                );
                const tmtseriesvariant =
                  tmtseriesnestedProduct.tmtseriesvariant.find(
                    (obj) => obj._id.toString() === product.variantId.toString()
                  );
                const tmtseriesloaction =
                  tmtseriesvariant.tmtserieslocation.find(
                    (obj) =>
                      obj._id.toString() === product.locationId.toString()
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
          // Product status update ---- end
          await order.save();
          // User cart remove ------ start
          {
            userCart.cartProducts = [];
            await userCart.save();
          }
          // User cart remove ------ end

          // Online order success then send email ------ Start
          {
            const emaildata = await SiteContent.findOne({
              key: "onlineOrderSuccess",
            });
            const emailsubject = await SiteContent.findOne({
              key: "onlineOrderSuccesssubject",
            });
            const adminemail = await SiteContent.findOne({
              key: "adminEnquiryEmail",
            });
            const accemail = await SiteContent.findOne({
              key: "accountsEnquiryEmail",
            });
            const master = await StoreFeature.findOne({});
            const olink = `${process.env.FRONT_URL}/order/${jsonResponse.order_id}`;
            const inputString = emaildata.content;
            const inputSubject = emailsubject.content;
            const params = {
              $firstname: order.shippingAddress.firstName,
              $lastname: order.shippingAddress.lastName,
              $mobile: order.shippingAddress.mobileNo,
              $email: users.email,
              $orderid: jsonResponse.order_id,
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
          }
          // Online order success then send email ------ End

          // SMS Start (Online Order success by Accounts admin/Site admin.) -----------------
          {
            const params = {
              $firstname: order.shippingAddress.firstName,
              $lastname: order.shippingAddress.lastName,
              $mobile: order.shippingAddress.mobileNo,
              $paymentmode: order.paymentmode,
              $paymentid: order.paymentId,
              $orderlink: orderlinkcustomer,
              $orderid: jsonResponse.order_id,
              $email: users.email,
              $amount: order.totalAmount,
              $website: master.storeName,
            };
            const sms = await models.SiteContent.findOne({
              key: "ordersuccesssms",
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
          // SMS End -----------------------------------------------------

          // Whatsapp Start ..................................................
          {
            const shippingDetails = `
            ${order.shippingAddress.firstName} ${
              order.shippingAddress.lastName
            }, 
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
            const formattedNext10thDay =
              next10thDay.toLocaleDateString("en-GB");
            const orderlinkcustomer = `${process.env.FRONT_URL}/order/${jsonResponse.order_id}`;
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
                            `${jsonResponse.order_id}`,
                            `${formattedDate}`,
                            `${formattedNext10thDay}`,
                            `${order.totalAmount}`,
                            `${shippingDetails}`,
                            `${orderlinkcustomer}`,
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

          response.redirect(302, process.env.SuccessURL);
        } else {
          order.onlinepaymentStatus = jsonResponse.order_status.toLowerCase();
          order.status = "cancelled";
          order.paymentGatewayResponse =
            '{"status":1,"msg":"' +
            jsonResponse.status_message +
            '","transaction_details":{"' +
            jsonResponse.order_id +
            '":{"mihpayid":"' +
            jsonResponse.tracking_id +
            '","amt":"' +
            jsonResponse.amount +
            '","transaction_amount":"' +
            jsonResponse.mer_amount +
            '","txnid":"' +
            jsonResponse.order_id +
            '","addedon":"' +
            jsonResponse.trans_date +
            '","payment_source":"ccavenue","mode":"' +
            jsonResponse.payment_mode +
            '","bankcode":"' +
            jsonResponse.payment_mode +
            '","status":"' +
            order.onlinepaymentStatus +
            '"}}}';
          await order.save();
          // Online order failed then Send email ------ Start
          {
            const emaildata = await SiteContent.findOne({
              key: "Onlinepaymentfailed",
            });
            const emailsubject = await SiteContent.findOne({
              key: "Onlinepaymentfailedsubject",
            });
            const adminemail = await SiteContent.findOne({
              key: "adminEnquiryEmail",
            });
            const master = await StoreFeature.findOne({});
            const olink = `${process.env.FRONT_URL}/order/${jsonResponse.order_id}`;
            const inputString = emaildata.content;
            const inputemailsubject = emailsubject.content;
            const params = {
              $firstname: order.shippingAddress.firstName,
              $lastname: order.shippingAddress.lastName,
              $mobile: order.shippingAddress.mobileNo,
              $email: users.email,
              $orderid: jsonResponse.order_id,
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
          }
          // Online order failed then Send email ------ End

          response.redirect(302, process.env.FailureURL);
        }        
        response.end();
        resolve(); 
      } catch (error) {
        reject(error); 
      }
    });
  });
}
