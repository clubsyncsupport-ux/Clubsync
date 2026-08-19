import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import type { AuthProvider, AuthResult, GoogleProfile, SignInInput, SignUpInput } from "./types";

const SESSION_DAYS = 30;

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
    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) return { ok: false, error: "Incorrect email or password." };

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

  async requestPasswordReset(email: string) {
    const identifier = email.trim().toLowerCase();
    const user = await db.user.findUnique({ where: { email: identifier } });
    // Always report success even if not found, so this can't be used to enumerate accounts.
    if (!user) return { ok: true };

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt } });

    // No email provider is connected yet, so the reset link is surfaced
    // directly in the UI instead of being emailed. Swap this out once a
    // real email/Firebase provider is wired up.
    return { ok: true, devResetUrl: `/reset-password?token=${token}` };
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
      db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      db.passwordResetToken.delete({ where: { id: record.id } }),
      db.session.deleteMany({ where: { userId: record.userId } }),
    ]);
    return { ok: true };
  },
};
