import jwt from "jsonwebtoken";
import User from "../models/User.js";
import constants from "../config/constant.js";
import { errorResponse } from "../utils/response.js";

export const adminAuthMiddleware = async (req, res, next) => {
  try {
    // Read token from headers
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(res, 401, "Unauthorized: No token provided");
    }

    const token = authHeader.split(" ")[1];
 
    // Verify JWT token
    const decoded = jwt.verify(token, constants.JWT_SECRET);
    

    // Check if token has admin role
    if (decoded.role !== "admin") {
      return errorResponse(res, 403, "Forbidden: Admin access required");
    }

    // Attach admin to request (using User model with admin role)
    const admin = await User.findOne({ _id: decoded.id, role: "admin" }).select("-password");


    if (!admin) {
      return errorResponse(res, 401, "Invalid token: Admin does not exist");
    }

    req.admin = admin; // add admin to request object

    next(); // continue to route

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return errorResponse(res, 401, "Token expired, please log in again");
    }
    return errorResponse(res, 401, "Unauthorized: Invalid token");
  }
};
