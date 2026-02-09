// src/graphql/types/adTypes.js

import { gql } from "apollo-server";

export const AdsType = gql`
  type Ads {
    key: String
    images: String
    url: String
    active:Boolean
  }
`;
