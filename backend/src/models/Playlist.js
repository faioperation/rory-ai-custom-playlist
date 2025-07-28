import { Schema } from "mongoose";
import mongoose from "mongoose";

const PlaylistSchema = new Schema({
  quizId: { type: Schema.Types.ObjectId, ref: "Quiz", unique: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  title: String,
  description: String,
  tracks: Array,
  spotify_url: String,
  song_count: Number,
  playlist_type: { type: String, enum: ["default", "premium"], default: "default" },

}, { timestamps: true });

export default mongoose.model("Playlist", PlaylistSchema);