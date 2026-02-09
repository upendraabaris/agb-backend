// src/graphql/types/siteContentTypes.js

import { gql } from "apollo-server";

export const SiteContentType = gql`
  type SiteContent {
    key: String
    content: String
    updatedAt: String
  }
  type SubscriptionLetter {
    id: ID
    message: String
    email: String
  }
  type SuccessMsg {
    message: String
  }
`;
