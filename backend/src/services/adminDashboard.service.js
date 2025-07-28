import User from "../models/User.js";
import Playlist from "../models/Playlist.js";
import Quiz from "../models/Quiz.js";
import bcrypt from "bcryptjs";

export const AdminDashboardService = {
    getDashboard: async () => {
        const [totalUsers, totalPlaylists, totalQuizzes, paidUserIds, recentPlaylists] =
            await Promise.all([
                User.countDocuments({ role: { $ne: "admin" } }),
                Playlist.countDocuments(),
                Quiz.countDocuments(),
                Playlist.distinct("userId", { playlist_type: "premium", userId: { $ne: null } }),
                Playlist.find({})
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .select("title playlist_type createdAt userId")
                    .populate("userId", "email name")
                    .lean(),
            ]);

        const paidUsers = paidUserIds.length;
        const freeUsers = Math.max(totalUsers - paidUsers, 0);

        const recentActivity = recentPlaylists.map((playlist) => ({
            user:
                playlist.userId?.email ||
                playlist.userId?.name ||
                "Guest",
            playlistTitle: playlist.title || "Untitled",
            type: playlist.playlist_type === "premium" ? "Paid" : "Free",
            date: playlist.createdAt,
            playlistId: playlist._id,
        }));

        return {
            totals: {
                totalUsers,
                totalPlaylists,
                totalQuizzes,
                paidUsers,
                freeUsers,
            },
            recentActivity,
        };
    },
    getUsers: async () => {
        const users = await User.aggregate([
            { $match: { role: { $ne: "admin" } } },
            {
                $lookup: {
                    from: "quizzes",
                    let: { userId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$userId", "$$userId"] },
                                status: "done",
                            },
                        },
                        { $sort: { createdAt: -1 } },
                        { $limit: 1 },
                        { $project: { createdAt: 1 } },
                    ],
                    as: "latestQuiz",
                },
            },
            {
                $lookup: {
                    from: "playlists",
                    let: { userId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$userId", "$$userId"] } } },
                        {
                            $group: {
                                _id: null,
                                count: { $sum: 1 },
                                hasPremium: {
                                    $max: {
                                        $cond: [{ $eq: ["$playlist_type", "premium"] }, 1, 0],
                                    },
                                },
                            },
                        },
                    ],
                    as: "playlistStats",
                },
            },
            {
                $addFields: {
                    quizCompletedAt: { $arrayElemAt: ["$latestQuiz.createdAt", 0] },
                    playlistCount: {
                        $ifNull: [{ $arrayElemAt: ["$playlistStats.count", 0] }, 0],
                    },
                    isPaid: {
                        $gt: [{ $ifNull: [{ $arrayElemAt: ["$playlistStats.hasPremium", 0] }, 0] }, 0],
                    },
                },
            },
            {
                $project: {
                    email: 1,
                    name: 1,
                    createdAt: 1,
                    quizCompletedAt: 1,
                    playlistCount: 1,
                    status: { $cond: ["$isPaid", "Paid", "Free"] },
                },
            },
        ]);

        return users;
    },

    deleteUser: async (userId) => {
        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return { success: false, message: "User not found" };
        }
        return { success: true, message: "User deleted successfully" };
    },

    getPlaylists: async () => {
        const playlists = await Playlist.find({})
            .sort({ createdAt: -1 })
            .select("title playlist_type createdAt userId")
            .populate("userId", "email name");

        return playlists.map((playlist) => ({
            user: playlist.userId?.email || playlist.userId?.name || "Guest",
            playlistTitle: playlist.title || "Untitled",
            type: playlist.playlist_type === "premium" ? "Paid" : "Free",
            date: playlist.createdAt,
            playlistId: playlist._id,
        }));
    },

    deletePlaylist: async (playlistId) => {
        const playlist = await Playlist.findByIdAndDelete(playlistId);
        if (!playlist) {
            return { success: false, message: "Playlist not found" };
        }
        return { success: true, message: "Playlist deleted successfully", playlistId };
    },
    updateAdminProfile: async (adminId, updates) => {
        const allowedUpdates = {};
        if (typeof updates.name === "string" && updates.name.trim()) {
            allowedUpdates.name = updates.name.trim();
        }
        if (typeof updates.profileImage === "string") {
            allowedUpdates.profileImage = updates.profileImage.trim();
        }

        if (!Object.keys(allowedUpdates).length) {
            return { success: false, message: "No valid updates provided" };
        }

        const admin = await User.findOneAndUpdate(
            { _id: adminId, role: "admin" },
            { $set: allowedUpdates },
            { new: true }
        ).select("name email profileImage role");

        if (!admin) {
            return { success: false, message: "Admin not found" };
        }

        return { success: true, message: "Profile updated successfully", admin };
    },
    changeAdminPassword: async (adminId, currentPassword, newPassword) => {
        const admin = await User.findOne({ _id: adminId, role: "admin" }).select("password");
        if (!admin) {
            return { success: false, message: "Admin not found" };
        }

        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) {
            return { success: false, message: "Current password is incorrect" };
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        admin.password = hashedPassword;
        admin.passwordChangeAt = new Date();
        await admin.save();

        return { success: true, message: "Password updated successfully" };
    },
};