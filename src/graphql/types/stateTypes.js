import { gql } from "apollo-server";

export const StateType = gql`
  type State {
    id: ID!
    state: String!
    pincode: [Int]!
  }

  type Success {
    message: String
  }
`;
