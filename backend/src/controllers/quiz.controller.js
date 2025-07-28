import { QuizService } from "../services/quiz.service.js";
import { errorResponse, successResponse } from "../utils/response.js";

export const submitGuestQuiz = async (req, res) => {
    try {
        const { answers, email, name } = req.body;

        if (!email || !name) {
            return errorResponse(res, 400, "Email and name are required");
        }


        const result = await QuizService.processGuestQuiz({
            answers,
            email,
            name
        });

        if (!result || !result.message) {
            return errorResponse(res, 500, "Failed to process quiz");
        }

        return successResponse(res, 200, result.message);

    } catch (error) {
        const status = error.status || 500;
        return errorResponse(res, status, error.message);
    }
};

export const submitUserQuiz = async (req, res) => {
    try {
        const userId = req.user._id;
        const { answers, user_type } = req.body;
        const result = await QuizService.processUserQuiz({
            answers,
            userId,
            user_type
        });
        return successResponse(res, 200, "Quiz submitted successfully", result);
    } catch (error) {
        const status = error.status || 500;
        return errorResponse(res, status, error.message);
    }
};


