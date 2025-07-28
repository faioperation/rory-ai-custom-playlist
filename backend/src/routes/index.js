import express from "express";
import authRoutes from "./auth.routes.js";
import quizRoutes from "./quiz.routes.js";
import playlistRoutes from "./playlist.routes.js";
import adminRoutes from "./admin.routes.js";

const routes = express.Router();

routes.use("/auth", authRoutes);

routes.use("/quiz", quizRoutes);

routes.use("/playlists", playlistRoutes);

routes.use("/admin", adminRoutes);

export default routes;