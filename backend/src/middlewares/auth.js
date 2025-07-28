import jwt from "jsonwebtoken";
import User from "../models/User.js";
import constants from "../config/constant.js";
import { errorResponse } from "../utils/response.js";

export const authMiddleware = async (req, res, next) => {
  try {
    // Read token from headers
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(res, 401, "Unauthorized: No token provided");
    }

    const token = authHeader.split(" ")[1];

    // Verify JWT token
    const decoded = jwt.verify(token, constants.JWT_SECRET);

    // Attach user to request
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return errorResponse(res, 401, "Invalid token: User does not exist");
    }

    req.user = user; // add user to request object

    next(); // continue to route

  } catch (error) {
    if (error.name === "TokenExpiredError") {
        return errorResponse(res, 401, "Token expired, please log in again");
      }
    return errorResponse(res, 401, "Unauthorized: Invalid token");
  }
};
