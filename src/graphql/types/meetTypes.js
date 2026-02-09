// src/graphql/types/meetTypes.js

import { gql } from "apollo-server";

export const MeetType = gql`
  type Meet {
    id: ID
    title: String
    image: String
    role: String
  }
`;
