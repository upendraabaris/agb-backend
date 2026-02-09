import { gql } from "apollo-server";
import { SlotType } from "../types/slotTypes.js";

export const SlotSchema = gql`
  ${SlotType}
  type Query {
    slots: [Slot]
    allSlots: [Slot]
    getSlot(id: ID!): Slot
    getSlotByAdType(ad_type: String!): [Slot]
  }

  type Mutation {
    createSlot(ad_slot: String!, ad_type: String!, position: String!, slot_number: Int!): Slot
    updateSlot(id: ID!, ad_slot: String, ad_type: String, position: String, slot_number: Int): Slot
    deleteSlot(id: ID!): DeleteResponse
    toggleSlotStatus(id: ID!): Slot
  }
`;
