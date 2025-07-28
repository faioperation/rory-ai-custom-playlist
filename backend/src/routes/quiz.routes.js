import express from "express";
import { submitGuestQuiz, submitUserQuiz } from "../controllers/quiz.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
const quizRoutes = express.Router();

quizRoutes.post("/guest/submit", submitGuestQuiz);
quizRoutes.post("/user/submit", authMiddleware, submitUserQuiz);

export default quizRoutes;
