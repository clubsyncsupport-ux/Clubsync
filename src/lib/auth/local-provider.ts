import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import type { AuthProvider, AuthResult, GoogleProfile, SignInInput, SignUpInput } from "./types";

const SESSION_DAYS = 30;
// Login rate-limiting: escalating lockout tiers. Each tier fires exactly when
// cumulative failedLoginAttempts hits its `attempts` value (attempts only
// increments while the account isn't currently locked, so in practice these
// land in order: 5 wrong -> 15min, 3 more (8) -> 30min, 3 more (11) -> 1hr,
// 2 more (13) -> 6hr, 2 more (15) -> 1 day AND the account is flagged
// mustResetPassword — at that point the lock timer stops mattering: sign-in
// stays refused until the owner completes "forgot password" (proof of email
// access), rather than just repeating the 1-day lock forever. A successful
// login, or a completed password reset, clears everything back to zero.
const LOCKOUT_TIERS = [
  { attempts: 5, minutes: 15 },
  { attempts: 8, minutes: 30 },
  { attempts: 11, minutes: 60 },
  { attempts: 13, minutes: 360 },
  { attempts: 15, minutes: 1440 },
] as const;
const CEILING_ATTEMPTS = LOCKOUT_TIERS[LOCKOUT_TIERS.length - 1].attempts;

function lockoutMinutesFor(attempts: number): number | null {
  return LOCKOUT_TIERS.find((t) => t.attempts === attempts)?.minutes ?? null;
}

function formatDuration(ms: number): string {
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.ceil(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

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

    if (user.mustResetPassword) {
      return {
        ok: false,
        error: "For your security, this account needs a password reset before signing in again. Use \"Forgot password\" to continue.",
      };
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = formatDuration(user.lockedUntil.getTime() - Date.now());
      return { ok: false, error: `Too many failed attempts. Try again in ${remaining}.` };
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      const lockoutMinutes = lockoutMinutesFor(attempts);
      await db.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: lockoutMinutes ? new Date(Date.now() + lockoutMinutes * 60_000) : null,
          ...(attempts >= CEILING_ATTEMPTS ? { mustResetPassword: true } : {}),
        },
      });
      return { ok: false, error: "Incorrect email or password." };
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await db.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
    }

    const { token, expiresAt } = await createSession(user.id);
    return { ok: true, user: toSessionUser(user), sessionToken: token, expiresAt };
  },

  async signInWithGoogle(profile: GoogleProfile, opts: { hasConsent: boolean }) {
    const email = profile.email.trim().toLowerCase();

    let user = await db.user.findUnique({ where: { googleId: profile.googleId } });
    if (!user) {
      const existingByEmail = await db.user.findUnique({ where: { email } });
      if (!existingByEmail && !opts.hasConsent) {
        return { ok: false, error: "You must agree to the Privacy Policy and Terms of Use to create an account." };
      }
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
    await db.user.update({
      where: { id: userId },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null, mustResetPassword: false },
    });
    return { ok: true };
  },

  async requestPasswordReset(email: string) {
    const identifier = email.trim().toLowerCase();
    const user = await db.user.findUnique({ where: { email: identifier } });
    // Always report success even if not found, so this can't be used to enumerate accounts.
    if (!user || !user.passwordHash) return { ok: true };

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt } });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await sendPasswordResetEmail(user.email, `${baseUrl}/reset-password?token=${token}`);

    return { ok: true };
  },

  async resetPassword(token: string, newPassword: string) {
    const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!record || record.expiresAt < new Date()) {
      return { ok: false, error: "This reset link is invalid or has expired." };
    }
    const passwordError = validatePassword(newPassword);
    if (passwordError) return { ok: false, error: passwordError };

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.$transaction([
      db.user.update({
        where: { id: record.userId },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null, mustResetPassword: false },
      }),
      db.passwordResetToken.delete({ where: { id: record.id } }),
      db.session.deleteMany({ where: { userId: record.userId } }),
    ]);
    return { ok: true };
  },
};
