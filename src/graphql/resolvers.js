// src/graphql/resolvers.js
import { default as GraphQLUpload } from "graphql-upload/GraphQLUpload.mjs";

import { User } from "./resolvers/UserResolver.js";
import { Query as UserQuery } from "./resolvers/UserResolver.js";
import { Mutation as UserMutation } from "./resolvers/UserResolver.js";

import { Address } from "./resolvers/AddressResolver.js";
import { Query as AddressQuery } from "./resolvers/AddressResolver.js";
import { Mutation as AddressMutation } from "./resolvers/AddressResolver.js";

import { Seller } from "./resolvers/SellerResolver.js";
import { Query as SellerQuery } from "./resolvers/SellerResolver.js";
import { Mutation as SellerMutation } from "./resolvers/SellerResolver.js";

import { Category } from "./resolvers/CategoryResolver.js";
import { Query as CategoryQuery } from "./resolvers/CategoryResolver.js";
import { Mutation as CategoryMutation } from "./resolvers/CategoryResolver.js";

import { ProductAttribute } from "./resolvers/ProductAttributeResolver.js";
import { Query as ProductAttributeQuery } from "./resolvers/ProductAttributeResolver.js";
import { Mutation as ProductMutationMutation } from "./resolvers/ProductAttributeResolver.js";

import { Blog } from "./resolvers/BlogResolver.js";
import { Query as BlogQuery } from "./resolvers/BlogResolver.js";
import { Mutation as BlogMutation } from "./resolvers/BlogResolver.js";

import { EmailTemp } from "./resolvers/EmailTempResolver.js";
import { Query as EmailTempQuery } from "./resolvers/EmailTempResolver.js";
import { Mutation as EmailTempMutation } from "./resolvers/EmailTempResolver.js";

import { Shipping } from "./resolvers/ShippingResolver.js";
import { Query as ShippingQuery } from "./resolvers/ShippingResolver.js";
import { Mutation as ShippingMutation } from "./resolvers/ShippingResolver.js";

import { CartProduct } from "./resolvers/CartResolver.js";
import { Query as CartQuery } from "./resolvers/CartResolver.js";
import { Mutation as CartMutation } from "./resolvers/CartResolver.js";
import { Subscription as CartSubscription } from "./resolvers/CartResolver.js";

import { AccountDetails } from "./resolvers/AccountdetailsResolver.js";
import { Query as AccountdetailsQuery } from "./resolvers/AccountdetailsResolver.js";
import { Mutation as AccountdetailsMutation } from "./resolvers/AccountdetailsResolver.js";

import { Enquery } from "./resolvers/EnqueryResolver.js";
import { Query as EnqueryQuery } from "./resolvers/EnqueryResolver.js";
import { Mutation as EnqueryMutation } from "./resolvers/EnqueryResolver.js";

import { Ad_hoc } from "./resolvers/Ad_hocResolver.js";
import { Query as Ad_hocQuery } from "./resolvers/Ad_hocResolver.js";
import { Mutation as Ad_hocMutation } from "./resolvers/Ad_hocResolver.js";


import { WishlistProduct } from "./resolvers/WishlistResolver.js";
import { Query as WishlistQuery } from "./resolvers/WishlistResolver.js";
import { Mutation as WishlistMutation } from "./resolvers/WishlistResolver.js";

import { Location } from "./resolvers/ProductResolver.js";
import { Query as ProductQuery } from "./resolvers/ProductResolver.js";
import { Mutation as ProductMutation } from "./resolvers/ProductResolver.js";

import { SeriesLocation } from "./resolvers/SeriesProductResolver.js";
import { Query as SeriesProductQuery } from "./resolvers/SeriesProductResolver.js";
import { Mutation as SeriesProductMutation } from "./resolvers/SeriesProductResolver.js";

import { TMTSeriesLocation } from "./resolvers/TMTSeriesProductResolver.js";
import { Query as TMTSeriesProductQuery } from "./resolvers/TMTSeriesProductResolver.js";
import { Mutation as TMTSeriesProductMutation } from "./resolvers/TMTSeriesProductResolver.js";

import { B2b } from "./resolvers/B2bResolver.js";
import { Query as B2bQuery } from "./resolvers/B2bResolver.js";
import { Mutation as B2bMutation } from "./resolvers/B2bResolver.js";

import { Query as HomePageSliderQuery } from "./resolvers/HomePageSliderResolver.js";
import { Mutation as HomePageSliderMutation } from "./resolvers/HomePageSliderResolver.js";

import { Query as SiteContentQuery } from "./resolvers/SiteContentResolver.js";
import { Mutation as SiteContentMutation } from "./resolvers/SiteContentResolver.js";

import { Query as AdsQuery } from "./resolvers/AdsResolver.js";
import { Mutation as AdsMutation } from "./resolvers/AdsResolver.js";

import { Inventory } from "./resolvers/InventoryResolver.js";
import { Query as InventoryQuery } from "./resolvers/InventoryResolver.js";
import { Mutation as InventoryMutation } from "./resolvers/InventoryResolver.js";

import { Order } from "./resolvers/OrderResolver.js";
import { OrderProduct } from "./resolvers/OrderResolver.js";
import { Query as OrderQuery } from "./resolvers/OrderResolver.js";
import { Mutation as OrderMutation } from "./resolvers/OrderResolver.js";

import { TMTMaster } from "./resolvers/TmtMasterResolver.js";
import { Query as TMTMasterQuery } from "./resolvers/TmtMasterResolver.js";
import { Mutation as TMTMasterMutation } from "./resolvers/TmtMasterResolver.js";

import { Review } from "./resolvers/ReviewResolver.js";
import { Query as ReviewQuery } from "./resolvers/ReviewResolver.js";
import { Mutation as ReviewMutation } from "./resolvers/ReviewResolver.js";

import { CouponCode } from "./resolvers/CouponCodeResolver.js";
import { Query as CouponCodeQuery } from "./resolvers/CouponCodeResolver.js";
import { Mutation as CouponCodeMutation } from "./resolvers/CouponCodeResolver.js";

import { StoreFeature } from "./resolvers/StoreFeatureResolver.js";
import { Query as StoreFeatureQuery } from "./resolvers/StoreFeatureResolver.js";
import { Mutation as StoreFeatureMutation } from "./resolvers/StoreFeatureResolver.js";

import { ProductClass } from "./resolvers/ProductClassResolver.js";
import { Query as ProductClassQuery } from "./resolvers/ProductClassResolver.js";
import { Mutation as ProductClassMutation } from "./resolvers/ProductClassResolver.js";

import { Commission } from "./resolvers/CommissonResolver.js";
import { Query as CommissionQuery } from "./resolvers/CommissonResolver.js";
import { Mutation as CommissionMutation } from "./resolvers/CommissonResolver.js";

import { QuatationProducts } from "./resolvers/QuatationResolver.js";
import { Query as QuatationQuery } from "./resolvers/QuatationResolver.js";
import { Mutation as QuatationMutation } from "./resolvers/QuatationResolver.js";

import { Query as MeetQuery } from "./resolvers/MeetResolver.js";
import { Mutation as MeetMutation } from "./resolvers/MeetResolver.js";

import { ProductHomeOrder } from "./resolvers/ProductHomeOrderResolver.js";
import { Query as ProductHomeOrderQuery } from "./resolvers/ProductHomeOrderResolver.js";
import { Mutation as ProductHomeOrderMutation } from "./resolvers/ProductHomeOrderResolver.js";

import { Query as StateQuery } from "./resolvers/stateResolver.js";
import { Mutation as StateMutation } from "./resolvers/stateResolver.js";

import { SuperLocation, SellerArray } from "./resolvers/SuperSellerProductResolver.js";
import { Query as SuperSellerQuery } from "./resolvers/SuperSellerProductResolver.js";
import { Mutation as SuperSellerMutation } from "./resolvers/SuperSellerProductResolver.js";

// import { Query as AdCategoryQuery, Mutation as AdCategoryMutation } from "./resolvers/AdCategoryResolver.js";
// AdCategoryResolver is still used for `AdCategory` entity; legacy AdCategoryMaster resolver removed
import { Query as AdCategoryQuery } from "./resolvers/AdCategoryResolver.js";
import { Mutation as AdCategoryMutation } from "./resolvers/AdCategoryResolver.js";

import { Query as AdTierMasterQuery } from "./resolvers/AdTierMasterResolver.js";
import { Mutation as AdTierMasterMutation } from "./resolvers/AdTierMasterResolver.js";

import { Query as CategoryRequestQuery } from "./resolvers/CategoryRequestResolver.js";
import { Mutation as CategoryRequestMutation } from "./resolvers/CategoryRequestResolver.js";

import { Query as AdReportingQuery } from "./resolvers/AdReportingResolver.js";

export const resolvers = {
  Upload: GraphQLUpload,
  Query: {
    ...UserQuery,
    ...AddressQuery,
    ...SellerQuery,
    ...CategoryQuery,
    ...ProductAttributeQuery,
    ...BlogQuery,
    ...EmailTempQuery,
    ...ShippingQuery,
    ...CartQuery,
    ...AccountdetailsQuery,
    ...EnqueryQuery,
    ...Ad_hocQuery,
    ...WishlistQuery,
    ...ProductQuery,
    ...SeriesProductQuery,
    ...TMTSeriesProductQuery,
    ...B2bQuery,
    ...HomePageSliderQuery,
    ...SiteContentQuery,
    ...AdsQuery,
    ...InventoryQuery,
    ...OrderQuery,
    ...TMTMasterQuery,
    ...ReviewQuery,
    ...CouponCodeQuery,
    ...StoreFeatureQuery,
    ...ProductClassQuery,
    ...CommissionQuery,
    ...QuatationQuery,
    ...MeetQuery,
    ...ProductHomeOrderQuery,
    ...StateQuery,
    ...SuperSellerQuery,
    ...AdCategoryQuery,
    ...AdTierMasterQuery,
    ...CategoryRequestQuery,
    ...AdReportingQuery,
  },
  Mutation: {
    ...UserMutation,
    ...AddressMutation,
    ...SellerMutation,
    ...CategoryMutation,
    ...ProductMutationMutation,
    ...BlogMutation,
    ...EmailTempMutation,
    ...ShippingMutation,
    ...CartMutation,
    ...AccountdetailsMutation,
    ...EnqueryMutation,
    ...Ad_hocMutation,
    ...WishlistMutation,
    ...ProductMutation,
    ...SeriesProductMutation,
    ...TMTSeriesProductMutation,
    ...B2bMutation,
    ...HomePageSliderMutation,
    ...SiteContentMutation,
    ...AdsMutation,
    ...InventoryMutation,
    ...OrderMutation,
    ...TMTMasterMutation,
    ...ReviewMutation,
    ...CouponCodeMutation,
    ...StoreFeatureMutation,
    ...ProductClassMutation,
    ...CommissionMutation,
    ...QuatationMutation,
    ...MeetMutation,
    ...ProductHomeOrderMutation,
    ...StateMutation,
    ...SuperSellerMutation,
    ...AdCategoryMutation,
    ...AdTierMasterMutation,
    ...CategoryRequestMutation
  },

  Subscription: {
    ...CartSubscription,
  },

  User,
  Address,
  Seller,
  Category,
  ProductAttribute,
  Blog,
  EmailTemp,
  Shipping,
  AccountDetails,
  Enquery,
  Ad_hoc,
  CartProduct,
  WishlistProduct,
  Location,
  SeriesLocation,
  TMTSeriesLocation,
  B2b,
  Inventory,
  Order,
  OrderProduct,
  TMTMaster,
  Review,
  CouponCode,
  StoreFeature,
  ProductClass,
  Commission,
  QuatationProducts,
  ProductHomeOrder,
  SuperLocation,
  SellerArray
};
