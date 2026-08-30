import { NextResponse } from "next/server";
import crypto from "crypto";
import { getRequestOrigin } from "@/lib/request-origin";
import { requireUser } from "@/lib/auth/session";

// Connecting Google Calendar is a separate, extra permission from signing in
// with Google — a signed-in user (any auth method) opts into this from
// Settings. Distinct state cookie from the sign-in flow so the two can't be
// confused if someone has both open.
const STATE_COOKIE = "clubsync_gcal_oauth_state";

export async function GET(request: Request) {
  await requireUser(); // must already be logged in to connect a calendar to an account

  const origin = getRequestOrigin(request);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/settings?error=google_calendar_not_configured", origin));
  }

  const state = crypto.randomBytes(24).toString("hex");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", `${origin}/api/auth/google-calendar/callback`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.readonly");
  authUrl.searchParams.set("state", state);
  // access_type=offline is what gets us a refresh_token (not just a
  // short-lived access token); prompt=consent forces Google to re-show the
  // consent screen and re-issue a refresh_token even if this account
  // previously granted the same scope, which it otherwise silently skips.
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
