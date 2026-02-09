import { gql } from "apollo-server";
import { StateType } from "../types/stateTypes.js";

export const StateSchema = gql`
  ${StateType}

  type Query {
    getState(id: ID!): State
    getAllStates: [State]
  }

  type Mutation {
    createState(state: String!, pincode: [Int]!): State
    updateState(id: ID!, state: String, pincode: [Int]): State
    deleteState(id: ID!): State
  }
`;
