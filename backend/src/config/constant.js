import dotenv from "dotenv";
dotenv.config();

export const constants = {
    PORT: process.env.PORT || 3000,
    ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || "*",
    MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    FRONTEND_URL: process.env.FRONTEND_URL ,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    AI_ENDPOINT: process.env.AI_ENDPOINT,
    BACKEND_URL: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`
}

export default constants;