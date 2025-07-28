import Playlist from "../models/Playlist.js";
import Quiz from "../models/Quiz.js";
import { QuizService } from "./quiz.service.js";

export const PlaylistService = {
    getGuestPlaylist: async (id) => {
        const playlist = await Playlist.findOne({ quizId: id }).populate("userId");
        if (!playlist) {
            throw new Error("Playlist not found");
        }
        return playlist;
    },
    getUserPlaylist: async (userId) => {
        const playlist = await Playlist.find({ userId: userId }).sort({ createdAt: 1 });
        if (!playlist) {
            throw new Error("Playlist not found");
        }
        return playlist;
    },
    upgradePlaylist: async (quizId, playlistId, userId) => {
        const quiz = await Quiz.findOne({ _id: quizId, userId: userId.toString() });
        if (!quiz) {
            throw new Error("Quiz not found");
        }

        const answers = quiz.answers;

        // const playlist = await Playlist.findOneAndDelete({ _id: playlistId, quizId: quizId });
        // if (!playlist) {
        //     throw new Error("Playlist not found");
        // }

        // await quiz.deleteOne();

        const result = await QuizService.processUserQuiz({
            userId: userId,
            answers: answers,
            user_type: "paid"
        });

        return result;

    }
}


