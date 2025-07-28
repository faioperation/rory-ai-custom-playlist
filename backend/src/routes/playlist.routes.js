import express from "express";
import { getGuestPlaylist, getUserPlaylist, upgradePlaylist } from "../controllers/playlist.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
const playlistRoutes = express.Router();

playlistRoutes.get("/guest/playlist/:id", getGuestPlaylist);
playlistRoutes.get("/user/playlist", authMiddleware, getUserPlaylist);

playlistRoutes.post("/upgrade", authMiddleware, upgradePlaylist);

export default playlistRoutes;
