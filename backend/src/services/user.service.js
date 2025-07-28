import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import constants from "../config/constant.js";
import { sendEmail, emailSignatureHtml } from "../utils/email.js";

export const userService = {
    createUser: async (name, email, password) => {
        const hashedPassword = await bcrypt.hash(password, 12);

        // Step 1: Check existing user
        const existingUser = await User.findOne({ email });

        if (existingUser && existingUser.role !== "guest") {
            return { success: false, message: "User already exists", status: 400 };
        }

        // Step 2: Create OR upgrade
        const user = await User.findOneAndUpdate(
            { email },
            {
                $set: {
                    name,
                    password: hashedPassword,
                    role: "user"
                },
                $setOnInsert: {
                    email
                }
            },
            {
                new: true,
                upsert: true
            }
        ).select("-password");

        return user;
    },

    loginUser: async (email, password) => {
        const user = await User.findOne({ email });
        if (!user) {
            const error = new Error("User not found");

            throw error;
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            const error = new Error("Invalid password");

            throw error;
        }

        if (!constants.JWT_SECRET) {
            const error = new Error("JWT secret is not configured");
            error.status = 500;
            throw error;
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            constants.JWT_SECRET,
            { expiresIn: constants.JWT_EXPIRES_IN }
        );

        // Remove sensitive fields before returning
        const safeUser = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profileImage: user.profileImage,
            isPremium: user.isPremium,
            createdAt: user.createdAt,
        };

        return { user: safeUser, token };
    },

    forgotPassword: async (email, role = null) => {
        // Unified password reset for both user and admin
        // If role is provided, filter by role; otherwise allow any role except guest
        const query = role
            ? { email, role }
            : { email, role: { $in: ["user", "admin"] } };

        const user = await User.findOne(query);
        if (!user) {
            const roleText = role === "admin" ? "Admin" : "User";
            return { success: false, message: `${roleText} not found`, status: 400 };
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        user.passwordResetOTP = otp.toString();
        user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        user.isOTPVerified = false;
        await user.save();

        const isAdmin = user.role === "admin";
        const greeting = isAdmin ? "Hello Admin," : "Hello,";
        const title = isAdmin ? "Admin Password Reset Request" : "Password Reset Request";
        const message = isAdmin
            ? "We received a request to reset your admin password. Please use the OTP below to continue."
            : "We received a request to reset your password. Please use the OTP below to continue.";
        const footer = isAdmin
            ? "Soundtrack My Night Admin Security Team"
            : "Soundtrack My Night Security Team";
        const warning = isAdmin
            ? "If you did not request this, please contact the system administrator immediately."
            : "If you did not request this, you can safely ignore this email.";

        await sendEmail(
            email,
            "🔐 Password Reset OTP",
            `
            <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
              
              <!-- Header -->
              <div style="background:linear-gradient(135deg,#1e1b4b 0%,#4f46e5 100%);padding:36px 30px;text-align:center;">
                <h1 style="color:#ffffff;font-size:22px;margin:0 0 6px;">🔐 ${title}</h1>
                <p style="color:#c7d2fe;font-size:14px;margin:0;">Soundtrack My Night</p>
              </div>

              <!-- Body -->
              <div style="padding:32px 30px;">
                
                <p style="color:#111827;font-size:16px;margin:0 0 8px;font-weight:600;">${greeting}</p>
                <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
                  ${message}
                </p>

                <!-- OTP Box -->
                <div style="text-align:center;margin:0 0 28px;">
                  <div style="display:inline-block;background:linear-gradient(135deg,#f9fafb,#f3f4f6);border:2px dashed #d1d5db;border-radius:12px;padding:20px 40px;">
                    <span style="font-size:32px;letter-spacing:8px;font-weight:800;color:#111827;font-family:'Courier New',monospace;">
                      ${otp}
                    </span>
                  </div>
                </div>

                <div style="background:#fef3c7;border-radius:8px;padding:14px 16px;border-left:4px solid #f59e0b;margin:0 0 24px;">
                  <p style="color:#92400e;font-size:13px;margin:0;">
                    ⏱️ This OTP will expire in <strong>10 minutes</strong>.<br/>
                    ${warning}
                  </p>
                </div>

                <p style="color:#4b5563;font-size:14px;margin:0 0 0;">Kind regards,</p>

                ${emailSignatureHtml}

              </div>
            </div>
            `
        );

        return { success: true, message: "Password reset email sent successfully", status: 200 };
    },
    
    verifyOTP: async (email, otp, role = null) => {
        // Unified OTP verification for both user and admin
        const query = role
            ? { email, role }
            : { email, role: { $in: ["user", "admin"] } };

        const user = await User.findOne(query).select("passwordResetOTP passwordResetExpires isOTPVerified role");
        if (!user) {
            const roleText = role === "admin" ? "Admin" : "User";
            return { success: false, message: `${roleText} not found`, status: 400 };
        }

        // Convert OTP to string for comparison (handles both string and number)
        const userOTP = user.passwordResetOTP?.toString();
        const providedOTP = otp?.toString();

        if (userOTP !== providedOTP) {
            return { success: false, message: "Invalid OTP", status: 400 };
        }
        if (user.passwordResetExpires < Date.now()) {
            return { success: false, message: "OTP expired", status: 400 };
        }
        user.isOTPVerified = true;
        await user.save();
        return { success: true, message: "OTP verified successfully", status: 200 };
    },
    resetPassword: async (email, newPassword, role = null) => {
        // Unified password reset for both user and admin
        const query = role
            ? { email, role, isOTPVerified: true }
            : { email, role: { $in: ["user", "admin"] }, isOTPVerified: true };

        const user = await User.findOne(query).select("password passwordResetOTP passwordResetExpires isOTPVerified role");
        if (!user) {
            const roleText = role === "admin" ? "Admin" : "User";
            return { success: false, message: `${roleText} not found or OTP not verified`, status: 400 };
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;
        user.passwordResetOTP = null;
        user.passwordResetExpires = null;
        user.isOTPVerified = false;
        await user.save();
        return { success: true, message: "Password reset successfully", status: 200 };
    },
    changePassword: async (id, currentPassword, newPassword) => {
        const user = await User.findById(id).select("password");
        if (!user) {
            return { success: false, message: "User not found" };
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return { success: false, message: "Current password is incorrect" };
        }
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;
        user.passwordChangeAt = new Date();
        await user.save();
        return { success: true, message: "Password changed successfully" };
    },
    updateProfile: async (userId, updates) => {
        const allowedUpdates = {};
        if (typeof updates.name === "string" && updates.name.trim()) {
            allowedUpdates.name = updates.name.trim();
        }
        if (typeof updates.profileImage === "string") {
            allowedUpdates.profileImage = updates.profileImage.trim();
        }

        if (!Object.keys(allowedUpdates).length) {
            return { success: false, message: "No valid updates provided", status: 400 };
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: allowedUpdates },
            { new: true }
        ).select("name email profileImage role");

        if (!user) {
            return { success: false, message: "User not found", status: 400 };
        }

        return { success: true, message: "Profile updated successfully", user, status: 200 };
    },
}