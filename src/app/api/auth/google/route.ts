import { NextResponse } from "next/server";
import crypto from "crypto";
import { getRequestOrigin } from "@/lib/request-origin";

// Short-lived cookie carrying a random value across the redirect to Google
// and back, so the callback can confirm the response really originated from
// the redirect we just sent (CSRF protection for the OAuth round trip).
const STATE_COOKIE = "clubsync_oauth_state";
// Set only when this flow started from the signup page's already-checked
// "I agree" box (see ?intent=signup below) — the callback requires this
// before it's willing to create a brand-new account, mirroring the same
// consent check already enforced server-side on the email/password signup
// path. A login-page click never sets this, but that's fine: logging into
// an *existing* account never needs it, only creating a new one does.
const SIGNUP_CONSENT_COOKIE = "clubsync_signup_consent";

export async function GET(request: Request) {
  const origin = getRequestOrigin(request);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", origin));
  }
  const isSignupIntent = new URL(request.url).searchParams.get("intent") === "signup";

  const state = crypto.randomBytes(24).toString("hex");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", `${origin}/api/auth/google/callback`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  if (isSignupIntent) {
    response.cookies.set(SIGNUP_CONSENT_COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
  }
  return response;
}
