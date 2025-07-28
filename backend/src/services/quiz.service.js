import Quiz from "../models/Quiz.js";
import Playlist from "../models/Playlist.js";
import constants from "../config/constant.js";
import { sendEmail, emailSignatureHtml } from "../utils/email.js";
import User from "../models/User.js";
import Stripe from "stripe";
import axios from "axios";

const stripe = new Stripe(constants.STRIPE_SECRET_KEY);

export const QuizService = {
    processGuestQuiz: async ({ answers, email, name }) => {

        const user = await User.findOneAndUpdate(
            { email },
            { name, type: "guest" },
            { upsert: true, new: true }
        );

        const quiz = await Quiz.create({
            userId: user._id,
            answers,
            status: "processing",
            songCount: 15,
            is_premium_requested: false
        });


        try {
            const aiRes = await axios.post(constants.AI_ENDPOINT + "/generate-playlist", {
                answers,
                user_type: "free"
            }, { headers: { "Content-Type": "application/json" } });



            if (aiRes.status !== 200) {
                quiz.status = "failed";
                await quiz.save();
                throw new Error("AI Failed to generate playlist");
            }

            const playlistData = aiRes.data.playlist;

            const playlist = await Playlist.create({
                userId: user._id,
                quizId: quiz._id,
                title: playlistData.title,
                description: playlistData.description,
                tracks: playlistData.tracks,
                spotify_url: playlistData.spotify_url,
                song_count: playlistData.song_count,
                playlist_type: "default"
            });

            quiz.status = "done";
            quiz.vibe_details = playlistData.vibe || null;
            await quiz.save();

            const playlistLink = `${constants.FRONTEND_URL}/playlist/${quiz._id}`;

            await sendEmail(
                email,
                `🎧 ${name}'s Playlist is ready`,
                `
                <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
                
                  <!-- Header -->
                  <div style="background:linear-gradient(135deg,#1e1b4b 0%,#4f46e5 100%);padding:40px 30px;text-align:center;">
                    <h1 style="color:#ffffff;font-size:22px;margin:0 0 8px;">🎧 Soundtrack My Night</h1>
                    <p style="color:#c7d2fe;font-size:14px;margin:0;">Your personalised playlist is ready</p>
                  </div>

                  <!-- Body -->
                  <div style="padding:32px 30px;">
                    
                    <h2 style="color:#111827;font-size:20px;margin:0 0 12px;">Your free playlist has arrived!</h2>
                    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
                      This is a preview of your chosen vibe — giving you a taste of how your night could sound. Hit the button below to start listening.
                    </p>

                    <!-- CTA Button -->
                    <div style="text-align:center;margin:0 0 32px;">
                      <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${playlistLink}" style="height:50px;v-text-anchor:middle;width:260px;" arcsize="50%" fillcolor="#16a34a">
                        <center style="color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:bold;">▶ Listen to Your Playlist</center>
                      </v:roundrect>
                      <![endif]-->
                      <!--[if !mso]><!-->
                      <a href="${playlistLink}" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#15803d);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:50px;letter-spacing:0.3px;">
                        ▶&nbsp; Listen to Your Playlist
                      </a>
                      <!--<![endif]-->
                    </div>

                    <!-- Divider -->
                    <div style="border-top:1px solid #e5e7eb;margin:0 0 28px;"></div>

                    <!-- Upgrade Section -->
                    <div style="background:#f9fafb;border-radius:10px;padding:24px;border:1px solid #e5e7eb;">
                      <h3 style="color:#111827;font-size:17px;margin:0 0 10px;">🔥 Want the full experience?</h3>
                      <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 16px;">
                        Upgrade to the <strong>3-hour, 50-track Premium Playlist (€9)</strong> — designed to keep the energy high all night and easy to share with your partner, band, or DJ.
                      </p>

                      <!-- Upgrade Button -->
                      <div style="text-align:center;margin:0 0 20px;">
                        <a href="${playlistLink}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:12px 32px;border-radius:50px;letter-spacing:0.3px;">
                          ⚡&nbsp; Upgrade to Premium
                        </a>
                      </div>

                      <div style="background:#fef3c7;border-radius:8px;padding:14px 16px;border-left:4px solid #f59e0b;">
                        <p style="color:#92400e;font-size:13px;margin:0;">
                          🎁 <strong>Free bonus with upgrade:</strong><br/>
                          Our <strong>Ultimate Guide to Wedding Entertainment in Ireland (PDF)</strong>
                        </p>
                      </div>
                    </div>

                    <p style="color:#4b5563;font-size:14px;margin:24px 0 0;">Kind regards,</p>

                    ${emailSignatureHtml}

                  </div>
                </div>
                `
            );

            return {
                success: true,
                message: "Playlist sent to email!",
                playlistLink
            };
        } catch (error) {

        }
    },

    processUserQuiz: async ({ userId, answers, user_type }) => {
        const quiz = await Quiz.create({
            userId,
            answers,
            is_premium_requested: user_type === "paid" ? true : false,
            status: user_type === "paid" ? "pending" : "processing",
            song_count: user_type === "paid" ? 50 : 15
        });


        if (user_type === "free") {

            const aiRes = await axios.post(constants.AI_ENDPOINT + "/generate-playlist", {
                answers,
                user_type: "free"
            });

            const playlistData = aiRes.data.playlist;

            const playlist = await Playlist.create({
                userId,
                quizId: quiz._id,
                title: playlistData.title,
                description: playlistData.description,
                tracks: playlistData.tracks,
                spotify_url: playlistData.spotify_url,
                song_count: playlistData.song_count || 15,
                playlist_type: "default"
            });


            quiz.status = "done";
            quiz.vibe_details = playlistData.vibe || null;
            await quiz.save();

            return {
                type: "default",
                playlist,
                quizId: quiz._id
            };
        }

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "eur",
                        product_data: { name: "Premium Playlist (50 songs)" },
                        unit_amount: 900
                    },
                    quantity: 1
                }
            ],
            success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel`,
            metadata: {
                quizId: quiz._id.toString(),
                userId: userId.toString(),
                premium: "true"
            }
        });

        return {
            type: "premium_payment",
            checkoutUrl: session.url,
            quizId: quiz._id
        };
    },
};