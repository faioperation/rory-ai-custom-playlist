import express from "express"
import { adminAuthMiddleware } from "../middlewares/adminAuth.js";
import { uploadAdminProfileImage } from "../middlewares/upload.js";
import {
    getDashboard,
    getUsers,
    deleteUser,
    getPlaylists,
    deletePlaylist,
    updateAdminProfile,
    changeAdminPassword
} from "../controllers/adminDashobard.controller.js";

const adminRoutes = express.Router();

adminRoutes.get("/dashboard", adminAuthMiddleware, getDashboard);

adminRoutes.get("/users", adminAuthMiddleware, getUsers);

adminRoutes.delete("/users/:id", adminAuthMiddleware, deleteUser);

adminRoutes.get("/playlists", adminAuthMiddleware, getPlaylists);

adminRoutes.delete("/playlists/:id", adminAuthMiddleware, deletePlaylist);

adminRoutes.patch(
    "/profile",
    adminAuthMiddleware,
    uploadAdminProfileImage.single("profileImage"),
    updateAdminProfile
);

adminRoutes.patch("/change-password", adminAuthMiddleware, changeAdminPassword);

export default adminRoutes;