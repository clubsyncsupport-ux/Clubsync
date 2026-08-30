import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRequestOrigin } from "@/lib/request-origin";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

const STATE_COOKIE = "clubsync_gcal_oauth_state";

export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const origin = getRequestOrigin(request);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const googleError = url.searchParams.get("error");

  const jar = await cookies();
  const expectedState = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);

  if (googleError) {
    // Most commonly the student declined the consent screen — not a real error.
    return NextResponse.redirect(new URL("/settings?error=google_calendar_cancelled", origin));
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/settings?error=google_calendar_failed", origin));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/settings?error=google_calendar_not_configured", origin));
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/auth/google-calendar/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) throw new Error("Google token exchange failed");
    const tokens: { refresh_token?: string } = await tokenRes.json();

    // Google omits refresh_token if this account already granted this exact
    // scope and Google decided not to re-issue one despite prompt=consent
    // (rare, but happens). Without a refresh token there's nothing to store.
    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL("/settings?error=google_calendar_no_refresh_token", origin));
    }

    await db.user.update({
      where: { id: user.id },
      data: { googleCalendarRefreshToken: tokens.refresh_token, googleCalendarConnectedAt: new Date() },
    });

    return NextResponse.redirect(new URL("/settings?google_calendar_connected=1", origin));
  } catch {
    return NextResponse.redirect(new URL("/settings?error=google_calendar_failed", origin));
  }
}
