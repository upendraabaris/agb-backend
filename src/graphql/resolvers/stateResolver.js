import authenticate from "../../middlewares/auth.js";
import State from "../../models/State.js"; // Correctly import the State model

export const Query = {
  getState: authenticate(["admin", "customer"])(
    async (_, { id }) => {
      try {
        return await State.findById(id);
      } catch (error) {
        throw new Error(error.message);
      }
    }
  ),
  getAllStates: authenticate(["admin", "customer"])(
    async () => {
      try {
        const states = await State.find();
        states.sort((a, b) => a.state.localeCompare(b.state));
        return states;
      } catch (error) {
        throw new Error(error.message);
      }
    }
  ),
};

export const Mutation = {
  createState: authenticate(["admin"])(  
    async (_, { state, pincode }) => {
      try {
        const newState = new State({
          state,
          pincode,
        });
        return await newState.save();
      } catch (error) {
        throw new Error(error.message);
      }
    }
  ),
  updateState: authenticate(["admin"])(
    async (_, { id, state, pincode }) => {
      try {
        return await State.findByIdAndUpdate(
          id,
          {
            state,
            pincode,
          },
          { new: true }
        );
      } catch (error) {
        throw new Error(error.message);
      }
    }
  ),
  deleteState: authenticate(["admin"])(async (_, { id }) => {
    try {
      return await State.findByIdAndDelete(id);
    } catch (error) {
      throw new Error(error.message);
    }
  }),
};
