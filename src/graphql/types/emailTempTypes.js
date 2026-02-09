// src/graphql/types/emailTempTypes.js

import { gql } from "apollo-server";

export const EmailTempType = gql`
  type EmailTemp {
    id: ID!
    userId: User
    title: String!
    html: String!
    design: String!
  }
`;
