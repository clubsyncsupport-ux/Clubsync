import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "ClubSync <noreply@clubsync.ca>";

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your ClubSync password",
    html: `
      <p>Someone requested a password reset for this ClubSync account.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email — your password won't change.</p>
    `,
  });
}
