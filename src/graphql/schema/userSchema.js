import { gql } from "apollo-server";
import { UserType } from "../types/userTypes.js";

export const UserSchema = gql`
  ${UserType}

  type Query {
    getUser(id: ID!): User
    getProfile: User
    getSuperSeller: [User]
    getUsers(
      search: String
      limit: Int
      offset: Int
      sortBy: String
      sortOrder: String
    ): [User!]
    verifyAccessToken(token: String): Boolean!
  }

  type Mutation {
    registerUser(
      firstName: String!
      lastName: String!
      email: String!
      mobileNo: String!
      password: String!
    ): AuthPayload!

    registerUserWithSeller(
      firstName: String!
      lastName: String!
      email: String!
      mobileNo: String!
      password: String!
      userId: ID
      companyName: String!
      gstin: String!
      fullAddress: String!
      city: String!
      state: String!
      pincode: String!
      companyDescription: String!
      status: Boolean
      bastatus: Boolean
      dealerstatus: Boolean
    ): Seller!

    updateUser(
      id: ID!
      firstName: String
      lastName: String
      email: String
      mobileNo: String
      password: String
      role: [String]
    ): User!

    profileedit(
      firstName: String
      lastName: String
      email: String
      mobileNo: String
      file: Upload
    ): User!

    deleteUser(id: ID!): User!

    addRoleTouser(userId: ID, role: String): User!

    removeRole(userId: ID, role: String): User!

    loginUser(email: String!, password: String!): AuthPayload!

    loginWith(email: String!, firstName: String!): AuthPayload!

    getTokens(email: String!, password: String!): AuthPayload!

    refreshAccessToken(refreshToken: String!): AuthPayload!

    changePassword(id: ID!, oldPassword: String!, newPassword: String!): User!

    requestPasswordReset(email: String!): Boolean!

    resetPassword(token: String!, newPassword: String!): Boolean!
  }
`;
