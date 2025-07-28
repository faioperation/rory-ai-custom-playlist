import { PlaylistService } from "../services/playlist.service.js";
import { errorResponse, successResponse } from "../utils/response.js";

export const getGuestPlaylist = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await PlaylistService.getGuestPlaylist(id);

        return successResponse(res, 200, "Guest playlist fetched successfully", result);
    } catch (error) {
        const status = error.status || 500;
        return errorResponse(res, status, error.message);
    }
};


export const getUserPlaylist = async (req, res) => {
    try {
        // const { id } = req.params;
        const userId = req.user._id;
        const result = await PlaylistService.getUserPlaylist(userId);
        return successResponse(res, 200, "User playlist fetched successfully", result);
    } catch (error) {
        const status = error.status || 500;
        return errorResponse(res, status, error.message);
    }
};

export const upgradePlaylist = async (req, res) => {
    try {
        const userId = req.user._id;
        const { quizId, playlistId } = req.body;
        if (!quizId || !playlistId) {
            return errorResponse(res, 400, "Quiz ID and playlist ID are required");
        }
        const result = await PlaylistService.upgradePlaylist(quizId, playlistId, userId);
        return successResponse(res, 200, result);
    } catch (error) {
        const status = error.status || 500;
        return errorResponse(res, status, error.message);
    }
};