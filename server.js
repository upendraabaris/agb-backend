import "dotenv/config";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import cron from "node-cron";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { postReq } from "./src/controller/ccavRequestHandler.js";
import { postRes } from "./src/controller/ccavResponseHandler.js";
import { typeDefs } from "./src/graphql/typeDefs.js";
import { resolvers } from "./src/graphql/resolvers.js";
import { createServer } from "http";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { PubSub } from "graphql-subscriptions";
import "./src/db/mongodb.js";
import models from "./src/models/index.js";
import graphqlUploadExpress from "graphql-upload/graphqlUploadExpress.mjs";
import { start } from "repl";

const pubsub = new PubSub();

const Server = async () => {
  const app = express();
  const httpServer = createServer(app);
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Creating the WebSocket server
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/api/graphql",
  });

  // Hand in the schema we just created and have the
  // WebSocketServer start listening.
  const serverCleanup = useServer(
    {
      schema,
      introspection: false,
      context: async () => ({
        pubsub,
      }),
    },
    wsServer
  );

  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });
  await server.start();
  const corsOptions = {
    origin: [
      "http://localhost:3000",
      "https://sailsalemonline.com",
      "https://www.sailsalemonline.com",
    ],
  };
  // app.use(cors());
  app.use(cors(corsOptions));
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  app.use(bodyParser.json());
  app.use("/uploads", express.static(path.join(__dirname, "./uploads")));

  app.post("/api/ccavRequestHandler", function (request, response) {
    postReq(request, response);
  });

  app.post("/api/ccavResponseHandler", function (request, response) {
    postRes(request, response);
  });

  app.use(
    "/api/graphql",
    cors(corsOptions),
    bodyParser.json({ limit: "50mb" }),
    bodyParser.urlencoded({ limit: "50mb", extended: true }),
    graphqlUploadExpress(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const token = req.headers.authorization;
        let auth = false;

        if (token) {
          auth = true;
        }

        return {
          req,
          auth,
          pubsub,
          models,
        };
      },
    })
  );

  // Function to toggle coupon code status
  const toggleCouponCodeActive = async (couponCodeId, active) => {
    try {
      await models.CouponCode.updateOne({ _id: couponCodeId }, { active });
    } catch (error) {
      throw new Error(error);
    }
  };

  // CRON JOB: Coupon code status update
  cron.schedule("0 0 0 * * *", async () => {
    try {
      const currentDate = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
      currentDate.setHours(0, 0, 0, 0);
      const formattedDate = currentDate.toISOString().slice(0, 10);

      // Activate coupon codes whose start date is today
      const couponsToActivate = await models.CouponCode.find({
        start: formattedDate,
        active: false,
      });

      for (const coupon of couponsToActivate) {
        await toggleCouponCodeActive(coupon._id, true);
      }

      // currentDate.setHours(0, 0, 0, 0); // Set hours to 0 to get the start of the day
      // const nextDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
      // const formattedNextDate = nextDate.toISOString().slice(0, 10);

      // Deactivate coupon codes whose end date is today
      const couponsToDeactivate = await models.CouponCode.find({
        end: formattedDate,
        active: true,
      });

      for (const coupon of couponsToDeactivate) {
        await toggleCouponCodeActive(coupon._id, false);
      }
    } catch (error) {
      console.error("Error in coupon code cron job:", error);
    }
  });

  // CRON JOB: Bills table se check karke accounts_status update karo
  cron.schedule("0 0 * * *", async () => {
    try {
      const pendingBills = await models.Bill.find({
        $or: [
          { accounts_status: false },
          { accounts_status: { $exists: false } },
        ],
      });

      for (const bill of pendingBills) {
        const order = await models.Order.findOne({
          orderProducts: {
            $elemMatch: {
              packageIdentifier: bill.packedID,
              delivered: true,
            },
          },
        });

        if (!order) continue;

        const product = order.orderProducts.find(
          (p) => p.packageIdentifier === bill.packedID
        );

        if (product && product.delivered === true) {
          const result = await models.Bill.updateOne(
            { _id: bill._id },
            { $set: { accounts_status: true } }
          );
        }
      }
    } catch (error) {
      console.error("❌ Error in accounts_status cron job:", error);
    }
  });

  await new Promise((resolve) =>
    httpServer.listen({ port: process.env.PORT }, resolve)
  );
  console.log(
    `🚀 Server ready at http://localhost:${process.env.PORT}/api/graphql`
  );
};

Server();
