import { gql } from "apollo-server";
import { UserSchema } from "./schema/userSchema.js";
import { AddressSchema } from "./schema/addressSchema.js";
import { SellerSchema } from "./schema/sellerSchema.js";
import { CategorySchema } from "./schema/categorySchema.js";
import { ProcdutAttributeSchema } from "./schema/productAttributeSchema.js";
import { BlogSchema } from "./schema/blogSchema.js";
import { EmailTempSchema } from "./schema/emailTempSchema.js";
import { ShippingSchema } from "./schema/shippingSchema.js";
import { CartSchema } from "./schema/cartSchema.js";
import { AccountDetailsSchema } from "./schema/accountDetailsSchema.js";
import { EnquerySchema } from "./schema/enquerySchema.js";
import { Ad_hocSchema } from "./schema/ad_hocSchema.js";
import { AdCategorySchema } from "./schema/adCategorySchema.js";
import { AdTierMasterSchema } from "./schema/adTierMasterSchema.js";
import { WishlistSchema } from "./schema/wishlistSchema.js";
import { ProductSchema } from "./schema/productSchema.js";
import { SeriesProductSchema } from "./schema/seriesProductSchema.js";
import { TMTSeriesProductSchema } from "./schema/tmtSeriesProductSchema.js";
import { B2bSchema } from "./schema/b2bSchema.js";
import { SiteContentSchema } from "./schema/siteContentSchema.js";
import { HomePageSliderSchema } from "./schema/homePageSliderSchema.js";
import { AdsSchema } from "./schema/adsSchema.js";
import { InventorySchema } from "./schema/inventorySchema.js";
import { OrderSchema } from "./schema/orderSchema.js";
import { TMTMaterSchema } from "./schema/tmtMasterSchema.js";
import { ReviewSchema } from "./schema/reviewSchema.js";
import { CouponCodeSchema } from "./schema/couponCodeSchema.js";
import { StoreFeatureSchema } from "./schema/storeFeatureSchema.js";
import { CommissionSchema } from "./schema/commissionSchema.js";
import { QuatationSchema } from "./schema/quatationSchema.js";
import { MeetSchema } from "./schema/meetSchema.js";
import { ProductHomeOrderSchema } from "./schema/productHomeOrderSchema.js";
import { ProductClassSchema } from "./schema/productClassSchema.js";
import { StateSchema } from "./schema/stateSchema.js";
import { SuperSellerProductSchema } from "./schema/superSellerSchema.js";
import { CategoryRequestSchema } from "./schema/categoryRequestSchema.js";
import { AdReportingSchema } from "./schema/adReportingSchema.js";
import { ProductAdRequestSchema } from "./schema/productAdRequestSchema.js";
import { WalletSchema } from "./schema/walletSchema.js";

export const RootSchema = gql`
  scalar Upload
  type Query {
    _empty: String
  }

  type Mutation {
    _empty: String
  }
`;

export const typeDefs = [
  RootSchema,
  UserSchema,
  AddressSchema,
  SellerSchema,
  CategorySchema,
  ProcdutAttributeSchema,
  BlogSchema,
  EmailTempSchema,
  ShippingSchema,
  CartSchema,
  AccountDetailsSchema,
  EnquerySchema,
  Ad_hocSchema,
  WishlistSchema,
  AdCategorySchema,
  AdTierMasterSchema,
  ProductSchema,
  SeriesProductSchema,
  TMTSeriesProductSchema,
  B2bSchema,
  SiteContentSchema,
  HomePageSliderSchema,
  AdsSchema,
  InventorySchema,
  OrderSchema,
  TMTMaterSchema,
  ReviewSchema,
  CouponCodeSchema,
  StoreFeatureSchema,
  CommissionSchema,
  QuatationSchema,
  MeetSchema,
  ProductHomeOrderSchema,
  ProductClassSchema,
  StateSchema,
  SuperSellerProductSchema,
  CategoryRequestSchema,
  AdReportingSchema,
  ProductAdRequestSchema,
  WalletSchema,
];
