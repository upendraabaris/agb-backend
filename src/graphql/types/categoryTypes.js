// src/graphql/types/categoryTypes.js

import { gql } from "apollo-server";

export const CategoryType = gql`
  type Category {
    id: ID!
    name: String!
    image: String
    sliderImage: String
    adTierId: AdTierMaster
    description: String!
    parent: Category
    children: [Category]
    order: Int
  }
`;
