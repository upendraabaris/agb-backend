import { gql } from "apollo-server";
import { MeetType } from "../types/meetTypes.js";

export const MeetSchema = gql`
  ${MeetType}

  type Query {
    getMeet: [Meet]
  }

  type Mutation {
    createMeet(title: String, file: Upload, role: String): Meet

    updateMeet(title: String, file: Upload, role: String): Meet
  }
`;
