import { Schema } from "mongoose";
import mongoose from "mongoose";

const QuizSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  answers: { type: Object, required: true },
  status: {
    type: String,
    enum: ["pending", "processing", "done", "failed"],
    default: "pending"
  },
  song_count: { type: Number, default: 15 },
  vibe_details: { type: Object, default: null },
  is_premium_requested: Boolean,

}, { timestamps: true });

export default mongoose.model("Quiz", QuizSchema);
