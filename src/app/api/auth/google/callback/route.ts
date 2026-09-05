import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authProvider } from "@/lib/auth";
import { setSessionCookie } from "@/lib/auth/session";
import { resolveLandingPath } from "@/lib/viewer";
import { getRequestOrigin } from "@/lib/request-origin";

const STATE_COOKIE = "clubsync_oauth_state";
const SIGNUP_CONSENT_COOKIE = "clubsync_signup_consent";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getRequestOrigin(request);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const googleError = url.searchParams.get("error");

  const jar = await cookies();
  const expectedState = jar.get(STATE_COOKIE)?.value;
  const hasSignupConsent = jar.get(SIGNUP_CONSENT_COOKIE)?.value === "1";
  jar.delete(STATE_COOKIE);
  jar.delete(SIGNUP_CONSENT_COOKIE);

  if (googleError) {
    // The student closed/cancelled Google's consent screen — not a real error.
    return NextResponse.redirect(new URL("/login?error=google_cancelled", origin));
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=google_failed", origin));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", origin));
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) throw new Error("Google token exchange failed");
    const tokens: { access_token: string } = await tokenRes.json();

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) throw new Error("Google userinfo fetch failed");
    const profile: { sub: string; email?: string; email_verified?: boolean; given_name?: string; family_name?: string; name?: string; picture?: string } =
      await profileRes.json();

    if (!profile.email || profile.email_verified === false) {
      return NextResponse.redirect(new URL("/login?error=google_unverified_email", origin));
    }

    const result = await authProvider.signInWithGoogle(
      {
        googleId: profile.sub,
        email: profile.email,
        firstName: profile.given_name ?? profile.name ?? "Student",
        lastName: profile.family_name ?? "",
        avatarUrl: profile.picture,
      },
      { hasConsent: hasSignupConsent }
    );
    if (!result.ok) {
      return NextResponse.redirect(new URL("/signup?error=google_consent_required", origin));
    }

    await setSessionCookie(result.sessionToken, result.expiresAt);
    return NextResponse.redirect(new URL(await resolveLandingPath(result.user.id), origin));
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_failed", origin));
  }
}
