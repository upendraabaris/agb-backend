import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Added a second parameter `roles` which is an array of roles that are allowed to authenticate.
const requireAuth = async (context, roles = []) => {
  const authHeader = context.req.headers.authorization;

  if (!authHeader) {
    throw new Error("Authorization header is missing");
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    throw new Error("Authentication token is missing");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id);

    if (!user) {
      throw new Error("User not found");
    }

    // This is a new block of code. It checks if the authenticated user's role is in the allowed roles array.

    if (roles.length && !roles.some((role) => user.role.includes(role))) {
      throw new Error("Unauthorized");
    }

    return user;
  } catch (error) {
    throw new Error(error.message);
  }
};

// `authenticate` now takes an array of roles as a parameter.
const authenticate =
  (roles = []) =>
  (next) =>
  async (root, args, context, info) => {
    // Pass the `roles` to `requireAuth`.
    await requireAuth(context, roles);
    return next(root, args, context, info);
  };

export default authenticate;
