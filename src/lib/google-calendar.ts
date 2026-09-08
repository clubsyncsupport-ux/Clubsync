import "server-only";
import { db } from "@/lib/db";

export type GoogleCalendarEvent = { id: string; title: string; startAt: Date; allDay: boolean };

const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
// Refresh a bit before Google's own expiry so a token that's seconds from
// expiring never gets used for a request that then fails mid-flight.
const EXPIRY_SAFETY_BUFFER_MS = 60_000;

// Read-only, one-directional: pulls events from Google to show alongside
// club/personal ones. Never writes anything back to the person's Google
// Calendar. Returns [] on any failure (expired grant, network error, etc.)
// rather than breaking the calendar page for everything else on it.
//
// A fresh access token is cached on the User row (googleCalendarAccessToken
// / …ExpiresAt) — Google typically issues one valid for about an hour, so
// reusing it avoids exchanging the refresh token on every single calendar
// view. `cachedAccessToken`/`cachedAccessTokenExpiresAt` let the caller pass
// along whatever it already has on hand from its own User fetch, so this
// doesn't need a query of its own just to check them.
export async function getGoogleCalendarEvents(
  userId: string,
  refreshToken: string,
  rangeStart: Date,
  rangeEnd: Date,
  cachedAccessToken?: string | null,
  cachedAccessTokenExpiresAt?: Date | null
): Promise<GoogleCalendarEvent[]> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return [];

  const hasFreshCachedToken =
    !!cachedAccessToken && !!cachedAccessTokenExpiresAt && cachedAccessTokenExpiresAt.getTime() > Date.now() + EXPIRY_SAFETY_BUFFER_MS;

  async function refreshAccessToken(): Promise<string | null> {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!tokenRes.ok) {
      // Refresh token was revoked (e.g. the person disconnected ClubSync from
      // their Google Account settings directly) — clear it so Settings stops
      // showing "Connected" for a grant that no longer actually works.
      if (tokenRes.status === 400 || tokenRes.status === 401) {
        await db.user.update({
          where: { id: userId },
          data: {
            googleCalendarRefreshToken: null,
            googleCalendarConnectedAt: null,
            googleCalendarAccessToken: null,
            googleCalendarAccessTokenExpiresAt: null,
          },
        });
      }
      return null;
    }
    const { access_token, expires_in }: { access_token: string; expires_in: number } = await tokenRes.json();
    await db.user.update({
      where: { id: userId },
      data: { googleCalendarAccessToken: access_token, googleCalendarAccessTokenExpiresAt: new Date(Date.now() + expires_in * 1000) },
    });
    return access_token;
  }

  async function fetchEvents(accessToken: string): Promise<GoogleCalendarEvent[] | "unauthorized"> {
    const eventsUrl = new URL(EVENTS_URL);
    eventsUrl.searchParams.set("timeMin", rangeStart.toISOString());
    eventsUrl.searchParams.set("timeMax", rangeEnd.toISOString());
    eventsUrl.searchParams.set("singleEvents", "true");
    eventsUrl.searchParams.set("orderBy", "startTime");
    eventsUrl.searchParams.set("maxResults", "250");

    const eventsRes = await fetch(eventsUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (eventsRes.status === 401) return "unauthorized";
    if (!eventsRes.ok) return [];
    const data: { items?: { id: string; summary?: string; start?: { date?: string; dateTime?: string } }[] } = await eventsRes.json();

    return (data.items ?? [])
      .filter((e) => e.start?.date || e.start?.dateTime)
      .map((e) => ({
        id: `google-${e.id}`,
        title: e.summary ?? "(No title)",
        startAt: new Date(e.start!.dateTime ?? e.start!.date!),
        allDay: !e.start!.dateTime,
      }));
  }

  try {
    let accessToken = hasFreshCachedToken ? cachedAccessToken! : await refreshAccessToken();
    if (!accessToken) return [];

    let events = await fetchEvents(accessToken);
    if (events === "unauthorized" && hasFreshCachedToken) {
      // The cached token looked fresh but Google rejected it anyway (e.g.
      // the grant was revoked mid-window) — get a real one and try once more.
      accessToken = await refreshAccessToken();
      if (!accessToken) return [];
      events = await fetchEvents(accessToken);
    }
    return events === "unauthorized" ? [] : events;
  } catch {
    return [];
  }
}
