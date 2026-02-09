import { gql } from "apollo-server";
import { HomePageSliderType } from "../types/homePageSliderTypes.js";

export const HomePageSliderSchema = gql`
  ${HomePageSliderType}

  type Query {
    getHomePageSlider(key: String!): HomePageSlider
  }

  type Mutation {
    updateHomePageSlider(
      key: String!
      sliderimages: [Upload]
      content: String!
      url:String
    ): HomePageSlider
  }
`;
