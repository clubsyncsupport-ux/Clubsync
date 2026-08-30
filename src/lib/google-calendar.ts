import "server-only";
import { db } from "@/lib/db";

export type GoogleCalendarEvent = { id: string; title: string; startAt: Date; allDay: boolean };

// Read-only, one-directional: pulls events from Google to show alongside
// club/personal ones. Never writes anything back to the person's Google
// Calendar. Returns [] on any failure (expired grant, network error, etc.)
// rather than breaking the calendar page for everything else on it.
export async function getGoogleCalendarEvents(userId: string, refreshToken: string, rangeStart: Date, rangeEnd: Date): Promise<GoogleCalendarEvent[]> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return [];

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!tokenRes.ok) {
      // Refresh token was revoked (e.g. the person disconnected ClubSync from
      // their Google Account settings directly) — clear it so Settings stops
      // showing "Connected" for a grant that no longer actually works.
      if (tokenRes.status === 400 || tokenRes.status === 401) {
        await db.user.update({ where: { id: userId }, data: { googleCalendarRefreshToken: null, googleCalendarConnectedAt: null } });
      }
      return [];
    }
    const { access_token: accessToken }: { access_token: string } = await tokenRes.json();

    const eventsUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    eventsUrl.searchParams.set("timeMin", rangeStart.toISOString());
    eventsUrl.searchParams.set("timeMax", rangeEnd.toISOString());
    eventsUrl.searchParams.set("singleEvents", "true");
    eventsUrl.searchParams.set("orderBy", "startTime");
    eventsUrl.searchParams.set("maxResults", "250");

    const eventsRes = await fetch(eventsUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
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
  } catch {
    return [];
  }
}
