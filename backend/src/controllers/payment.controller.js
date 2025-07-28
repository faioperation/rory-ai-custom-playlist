import Stripe from "stripe";
import constants from "../config/constant.js";
import Quiz from "../models/Quiz.js";
import Playlist from "../models/Playlist.js";
import { successResponse, errorResponse } from "../utils/response.js";
const stripe = new Stripe(constants.STRIPE_SECRET_KEY);
import axios from "axios";

export const handleStripeWebhook = async (req, res) => {
    let event;
    //  Verify webhook signature
    try {
        const sig = req.headers["stripe-signature"];

        event = stripe.webhooks.constructEvent(
            req.body, // RAW body
            sig,
            constants.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return errorResponse(res, 400, "Webhook Error");
    }

    //  Handle only checkout completion
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        // Kick heavy work to the next tick so we can respond fast to Stripe.

        try {
            const { quizId, userId } = session.metadata || {};
            if (!quizId || !userId) {
                console.warn("Missing metadata, skipping");
                return;
            }

            const quiz = await Quiz.findById(quizId);
            if (!quiz) {
                console.warn("Quiz not found", { quizId });
                return;
            }

            //  IDEMPOTENCY: prevent duplicate playlists
            const existingPlaylist = await Playlist.findOne({
                quizId,
                playlist_type: "premium"
            });

            if (existingPlaylist) {

                return;
            }
            const aiRes = await axios.post(
                constants.AI_ENDPOINT + "/generate-playlist",
                { answers: quiz.answers, user_type: "paid" },
                { headers: { "Content-Type": "application/json" } },

            );

            const playlistData = aiRes.data.playlist;

            //  Save premium playlist (schema-correct)
            await Playlist.create({
                quizId: quiz._id,
                userId,
                title: playlistData.title,
                description: playlistData.description,
                tracks: playlistData.tracks,
                spotify_url: playlistData.spotify_url,
                song_count: playlistData.song_count,
                playlist_type: "premium"
            });

            //  Update quiz
            quiz.status = "done";
            quiz.vibe_details = playlistData.vibe || null;
            await quiz.save();


        } catch (err) {
            console.error("Background premium playlist error:", err);
        }

    }

    //  Always acknowledge Stripe
    return successResponse(res, 200, "Premium playlist generated successfully");
};
