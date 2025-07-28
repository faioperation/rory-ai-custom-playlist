import { successResponse, errorResponse } from "../utils/response.js";
import { userService } from "../services/user.service.js";

export const registerUser = async (req, res) => {
    try {
        
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return errorResponse(res, 400, "Name, email and password are required");
        }
        const user = await userService.createUser(name, email, password);
        if (user?._id) {
            return successResponse(res, 201, "User registered successfully", user);
        }
        return errorResponse(res, 400, user.message);
    } catch (error) {
        const status = error.status || 500;
        return errorResponse(res, status, error.message);
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return errorResponse(res, 400, "Email and password are required");
        }

        // Unified login for both user and admin - determines role from database
        const result = await userService.loginUser(email, password);
        const { user, token } = result;

        // Set cookie name based on role
        const cookieName = user.role === "admin" ? "adminToken" : "token";
        const message = user.role === "admin"
            ? "Admin logged in successfully"
            : "User logged in successfully";

        // Save token to cookie
        res.cookie(cookieName, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        return successResponse(res, 200, message, { user, token });
    } catch (error) {
        const status = error.status || 500;
        return errorResponse(res, status, error.message);
    }
}

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return errorResponse(res, 400, "Email is required");
        }
        // Unified password reset - works for both user and admin
        const result = await userService.forgotPassword(email);
        if (result.success) {
            return successResponse(res, 200, result.message, result);
        }
        return errorResponse(res, 400, result.message);
    } catch (error) {
        const status = error.status || 500;
        return errorResponse(res, status, error.message);
    }
}

export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return errorResponse(res, 400, "Email and OTP are required");
        }
        // Unified OTP verification - works for both user and admin
        const result = await userService.verifyOTP(email, otp);
        if (result.success) {
            return successResponse(res, 200, result.message, result);
        }
        return errorResponse(res, 400, result.message);
    } catch (error) {
        const status = error.status || 500;
        return errorResponse(res, status, error.message);
    }
}

export const resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        if (!email || !newPassword) {
            return errorResponse(res, 400, "Email and password are required");
        }
        // Unified password reset - works for both user and admin
        const result = await userService.resetPassword(email, newPassword);
        if (result.success) {
            return successResponse(res, 200, result.message, result);
        }
        return errorResponse(res, 400, result.message);
    } catch (error) {
        const status = error.status || 500;
        return errorResponse(res, status, error.message);
    }
}

export const changePassword = async (req, res) => {
  
    try {
        const id = req.user._id;
        if (!id) {
            return errorResponse(res, 401, "Unauthorized: User not found");
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return errorResponse(res, 400, "Current and new password are required");
        }

        const result = await userService.changePassword(id, currentPassword, newPassword);
        if (result.success) {
            return successResponse(res, 200, result.message, result);
        }
        return errorResponse(res, 400, result.message);
    } catch (error) {
        const status = error.status || 500;
        return errorResponse(res, status, error.message);
    }
}

export const updateProfile = async (req, res) => {
    try {
        const updates = {
            name: req.body?.name,
            profileImage: req.file ? `/uploads/user/${req.file.filename}` : undefined,
        };
        const result = await userService.updateProfile(req.user._id, updates);
        if (result.success) {
            return successResponse(res, 200, result.message, result.user);
        }
        return errorResponse(res, 400, result.message);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
}