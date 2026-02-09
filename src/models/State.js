// src/models/State.js
import mongoose from 'mongoose';

const StateSchema = new mongoose.Schema(
  {
    state: {
      type: String,
      required: true,
      unique: true,
    },
    pincode: {
      type: [Number],
      required: true,
    },
  },
  { timestamps: true }
);

const State = mongoose.model('State', StateSchema);

export default State;
