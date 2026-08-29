import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import type { AuthProvider, AuthResult, GoogleProfile, SignInInput, SignUpInput } from "./types";

const SESSION_DAYS = 30;
// Login rate-limiting: after this many consecutive wrong passwords, the
// account is locked for LOCKOUT_MINUTES regardless of whether a later
// attempt has the correct password — see signIn() below.
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;

function toSessionUser(u: { id: string; email: string; firstName: string; lastName: string }) {
  return { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName };
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createSession(userId: string, userAgent?: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({
    data: { userId, tokenHash: hashToken(token), userAgent, expiresAt },
  });
  return { token, expiresAt };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must contain both letters and numbers.";
  }
  return null;
}

// Local, self-contained auth provider: bcrypt-hashed passwords + opaque
// DB-backed session tokens in HTTP-only cookies. No external accounts,
// no API keys — everything lives in the local database.
export const localAuthProvider: AuthProvider = {
  async signUp(input: SignUpInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();

    if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
    const passwordError = validatePassword(input.password);
    if (passwordError) return { ok: false, error: passwordError };
    if (!input.firstName.trim() || !input.lastName.trim()) {
      return { ok: false, error: "First and last name are required." };
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return { ok: false, error: "An account with this email already exists." };
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
      },
    });

    const { token, expiresAt } = await createSession(user.id);
    return { ok: true, user: toSessionUser(user), sessionToken: token, expiresAt };
  },

  async signIn(input: SignInInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return { ok: false, error: "Incorrect email or password." };
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      return { ok: false, error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` };
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      const lockedUntil = attempts >= LOCKOUT_THRESHOLD ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null;
      await db.user.update({ where: { id: user.id }, data: { failedLoginAttempts: attempts, lockedUntil } });
      return { ok: false, error: "Incorrect email or password." };
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await db.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
    }

    const { token, expiresAt } = await createSession(user.id);
    return { ok: true, user: toSessionUser(user), sessionToken: token, expiresAt };
  },

  async signInWithGoogle(profile: GoogleProfile) {
    const email = profile.email.trim().toLowerCase();

    let user = await db.user.findUnique({ where: { googleId: profile.googleId } });
    if (!user) {
      const existingByEmail = await db.user.findUnique({ where: { email } });
      user = existingByEmail
        ? await db.user.update({ where: { id: existingByEmail.id }, data: { googleId: profile.googleId } })
        : await db.user.create({
            data: {
              email,
              googleId: profile.googleId,
              firstName: profile.firstName,
              lastName: profile.lastName,
              avatarUrl: profile.avatarUrl,
            },
          });
    }

    const { token, expiresAt } = await createSession(user.id);
    return { ok: true, user: toSessionUser(user), sessionToken: token, expiresAt } as const;
  },

  async signOut(sessionToken: string): Promise<void> {
    await db.session.deleteMany({ where: { tokenHash: hashToken(sessionToken) } });
  },

  async getUserFromSessionToken(token: string) {
    const session = await db.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) return null;
    return toSessionUser(session.user);
  },

  async changePassword(userId, currentPassword, newPassword) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) return { ok: false, error: "User not found." };
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return { ok: false, error: "Current password is incorrect." };
    const passwordError = validatePassword(newPassword);
    if (passwordError) return { ok: false, error: passwordError };
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.user.update({ where: { id: userId }, data: { passwordHash } });
    return { ok: true };
  },

};
