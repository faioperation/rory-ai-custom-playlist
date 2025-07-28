import { successResponse, errorResponse } from "../utils/response.js";
import { AdminDashboardService } from "../services/adminDashboard.service.js";
export const getDashboard = async (req, res) => {

    try {
        const result = await AdminDashboardService.getDashboard();
        return successResponse(res, 200, "Dashboard fetched successfully", result);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
}

export const getUsers = async (req, res) => {
    try {
        const result = await AdminDashboardService.getUsers();
        return successResponse(res, 200, "Users fetched successfully", result);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
}

export const deleteUser = async (req, res) => {
    try {

        const result = await AdminDashboardService.deleteUser(req.params.id);

        if (result.success) {
            return successResponse(res, 200, result.message, result);
        }
        return errorResponse(res, 400, result.message);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
}

export const getPlaylists = async (req, res) => {
    try {
        const result = await AdminDashboardService.getPlaylists();
        return successResponse(res, 200, "Playlists fetched successfully", result);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
}

export const deletePlaylist = async (req, res) => {
    try {
        const result = await AdminDashboardService.deletePlaylist(req.params.id);
        if (result.success) {
            return successResponse(res, 200, result.message, result);
        }
        return errorResponse(res, 400, result.message);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
}

export const updateAdminProfile = async (req, res) => {
    try {
        const updates = {
            name: req.body?.name,
            profileImage: req.file ? `/uploads/admin/${req.file.filename}` : undefined,
        };
        const result = await AdminDashboardService.updateAdminProfile(req.admin._id, updates);
        if (result.success) {
            return successResponse(res, 200, result.message, result.admin);
        }
        return errorResponse(res, 400, result.message);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
};

export const changeAdminPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return errorResponse(res, 400, "Current and new password are required");
        }
        const result = await AdminDashboardService.changeAdminPassword(
            req.admin._id,
            currentPassword,
            newPassword
        );
        if (result.success) {
            return successResponse(res, 200, result.message);
        }
        return errorResponse(res, 400, result.message);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
};