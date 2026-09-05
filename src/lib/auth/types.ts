// This is the seam the whole app codes against for authentication.
// Everything outside src/lib/auth/ calls the functions in session.ts,
// which delegate to whatever AuthProvider is exported from index.ts.
// To move to Firebase Auth later: implement this interface in a new
// firebase-provider.ts, then change the single export in index.ts.
// No page, component, or server action needs to change.

export interface AuthSessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

// The verified profile handed back after Google's OAuth code exchange
// completes (see src/app/api/auth/google/callback/route.ts) — by the time
// a provider sees this, Google has already confirmed the person owns this
// email address, so no separate email-verification step is needed here.
export interface GoogleProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export type AuthResult =
  | { ok: true; user: AuthSessionUser; sessionToken: string; expiresAt: Date }
  | { ok: false; error: string };

export interface AuthProvider {
  signUp(input: SignUpInput): Promise<AuthResult>;
  signIn(input: SignInInput): Promise<AuthResult>;
  // Looks up an existing account by googleId, falls back to linking an
  // existing password account by matching email, or creates a brand-new
  // account if neither exists. Logging into an existing account always
  // succeeds — Google has already verified the email by this point — but
  // creating a brand-new account requires `hasConsent`, mirroring the same
  // "agree to the Privacy Policy/Terms" gate enforced server-side on the
  // email/password signup path.
  signInWithGoogle(profile: GoogleProfile, opts: { hasConsent: boolean }): Promise<AuthResult>;
  signOut(sessionToken: string): Promise<void>;
  getUserFromSessionToken(token: string): Promise<AuthSessionUser | null>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ ok: true } | { ok: false; error: string }>;
  // Sends a reset email to the account's real address via Resend (see
  // src/lib/email.ts) — always reports success even if no account matches,
  // so this can't be used to enumerate which emails have accounts.
  // adminResetPasswordAction (src/app/actions/admin.ts) remains as a manual
  // fallback for an admin helping someone locked out of their email too.
  requestPasswordReset(email: string): Promise<{ ok: true }>;
  resetPassword(token: string, newPassword: string): Promise<{ ok: true } | { ok: false; error: string }>;
}
