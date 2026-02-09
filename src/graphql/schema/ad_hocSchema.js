import { gql } from "apollo-server";
import { Ad_hocType } from "../types/ad_hocTypes.js";

export const Ad_hocSchema = gql`
  ${Ad_hocType}

  type Query {
    getAd_hoc(id: ID!): Ad_hoc
    getAllAd_hoc: [Ad_hoc!]
  }

  type Mutation {
    createAd_hoc(userId: ID!, title: String!, price: String!): Ad_hoc!

    updateAd_hoc(id: ID!, title: String, price: String): Ad_hoc!

    deleteAd_hoc(id: ID!): Ad_hoc!

    deleteFile(url: String): DeleteFileResponse
  }
`;
