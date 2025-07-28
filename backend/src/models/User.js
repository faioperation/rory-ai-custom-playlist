import { Schema } from "mongoose";
import mongoose from "mongoose";

const UserSchema = new Schema(
    {
        name: { type: String },
        email: { type: String, unique: true, required: true },
        password: { type: String, },
        profileImage: { type: String, default: null },
        role: { type: String, enum: ["guest", "user", "admin"], default: "guest" },
        isPremium: { type: Boolean, default: false },
        isOTPVerified: {
            type: Boolean,
            default: false,
        },
        passwordChangeAt: {
            type: Date,
        },
        passwordResetOTP: {
            type: String,
            select: false,
            default: null,
        },
        passwordResetExpires: {
            type: Date,
            select: false,
            default: null,
        },
    },
    { timestamps: true }
);

export default mongoose.model("User", UserSchema);