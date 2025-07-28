import express from "express";
import { handleStripeWebhook } from "../controllers/payment.controller.js";

const paymentRoutes = express.Router();

// Stripe webhook MUST use raw body
paymentRoutes.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

export default paymentRoutes;
