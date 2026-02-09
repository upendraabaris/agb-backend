// src/graphql/types/homePageSliderTypes.js

import { gql } from "apollo-server";

export const HomePageSliderType = gql`
  type HomePageSlider {
    key: String
    images: [String]
    content: String
    url: String
  }
`;
