import nodemailer from "nodemailer";
import constants from "../config/constant.js";

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 587,
  secure: false,
  auth: {
    user: constants.EMAIL_USER,
    pass: constants.EMAIL_PASS
  },
  requireTLS: true
});

export const emailSignatureHtml = `
  <div style="margin-top:32px;padding-top:24px;border-top:2px solid #e5e7eb;">
    <div style="font-family:'Segoe UI',Arial,sans-serif;">
      <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#111827;">Rory Clerkin</p>
      <p style="margin:0 0 2px;font-size:13px;color:#4b5563;font-weight:600;">Soundtrack My Night</p>
      <p style="margin:0 0 12px;font-size:12px;color:#6b7280;font-style:italic;">Powered by DJ and SAX®</p>
      <table cellpadding="0" cellspacing="0" border="0" style="font-size:13px;color:#4b5563;">
        <tr>
          <td style="padding:2px 0;">📞</td>
          <td style="padding:2px 0 2px 6px;"><a href="tel:0879575653" style="color:#4b5563;text-decoration:none;">087 9575653</a></td>
        </tr>
        <tr>
          <td style="padding:2px 0;">✉️</td>
          <td style="padding:2px 0 2px 6px;"><a href="mailto:info@soundtrackmynight.com" style="color:#4f46e5;text-decoration:none;">info@soundtrackmynight.com</a></td>
        </tr>
        <tr>
          <td style="padding:2px 0;">🌐</td>
          <td style="padding:2px 0 2px 6px;"><a href="https://soundtrackmynight.com" style="color:#4f46e5;text-decoration:none;">soundtrackmynight.com</a></td>
        </tr>
        <tr>
          <td style="padding:2px 0;">🌐</td>
          <td style="padding:2px 0 2px 6px;"><a href="https://www.djandsax.ie" style="color:#4f46e5;text-decoration:none;">www.djandsax.ie</a></td>
        </tr>
      </table>
      <div style="margin-top:12px;background:linear-gradient(135deg,#ec4899,#f43f5e);color:#ffffff;font-size:12px;font-weight:700;padding:8px 16px;border-radius:6px;display:inline-block;letter-spacing:0.3px;">
        Ireland's multi award-winning wedding entertainment team
      </div>
    </div>
    <p style="margin:16px 0 0;font-size:10px;color:#9ca3af;line-height:1.5;border-top:1px solid #e5e7eb;padding-top:12px;">
      The content of this email is confidential and intended for the recipient specified in message only. It is strictly forbidden to share any part of this message with any third party, without a written consent of the sender. If you received this message by mistake, please reply to this message and follow with its deletion, so that we can ensure such a mistake does not occur in the future.
    </p>
  </div>
`;

export const sendEmail = async (to, subject, html) => {
  return transporter.sendMail({
    from: `"Soundtrack My Night" <info@soundtrackmynight.com>`,
    to,
    subject,
    html,
  });
};
