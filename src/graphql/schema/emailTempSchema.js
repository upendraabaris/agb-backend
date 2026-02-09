import { gql } from "apollo-server";
import { EmailTempType } from "../types/emailTempTypes.js";

export const EmailTempSchema = gql`
  ${EmailTempType}

  type Query {
    getEmailTemp(id: ID!): EmailTemp
    getAllEmailTemp: [EmailTemp!]
  }

  type Mutation {
    createEmailTemp(title: String!, html: String!, design: String!): EmailTemp!

    updateEmailTemp(
      id: ID!
      title: String
      html: String!
      design: String!
    ): EmailTemp!

    deleteEmailTemp(id: ID!): EmailTemp!
  }
`;
