import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authProvider } from "./index";
import type { AuthSessionUser } from "./types";

const SESSION_COOKIE = "clubsync_session";
const ACTIVE_PROFILE_COOKIE = "clubsync_active_profile";

export async function setSessionCookie(token: string, expiresAt: Date) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(ACTIVE_PROFILE_COOKIE);
}

export async function getCurrentUser(): Promise<AuthSessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return authProvider.getUserFromSessionToken(token);
}

export async function getSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

/** Redirects to /login if there's no authenticated user. */
export async function requireUser(): Promise<AuthSessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// The "active profile" is which lens the signed-in user is currently viewing
// the app through: their own Student view, a Club Director view scoped to a
// specific club they run, a School Admin view scoped to the school they
// administer, or (for platform admins) the Admin view.
export type ActiveProfile =
  | { kind: "student" }
  | { kind: "director"; clubId: string }
  | { kind: "school-admin"; schoolId: string }
  | { kind: "admin" };

export async function getActiveProfile(): Promise<ActiveProfile> {
  const jar = await cookies();
  const raw = jar.get(ACTIVE_PROFILE_COOKIE)?.value;
  if (!raw || raw === "student") return { kind: "student" };
  if (raw === "admin") return { kind: "admin" };
  if (raw.startsWith("director:")) return { kind: "director", clubId: raw.slice("director:".length) };
  if (raw.startsWith("school-admin:")) return { kind: "school-admin", schoolId: raw.slice("school-admin:".length) };
  return { kind: "student" };
}

export async function setActiveProfile(profile: ActiveProfile) {
  const jar = await cookies();
  const value = profile.kind === "director" ? `director:${profile.clubId}` : profile.kind === "school-admin" ? `school-admin:${profile.schoolId}` : profile.kind;
  jar.set(ACTIVE_PROFILE_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
