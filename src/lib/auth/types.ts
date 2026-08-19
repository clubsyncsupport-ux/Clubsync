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
  // account if neither exists. Always succeeds (no AuthResult error case)
  // since Google has already verified the email by this point.
  signInWithGoogle(profile: GoogleProfile): Promise<Extract<AuthResult, { ok: true }>>;
  signOut(sessionToken: string): Promise<void>;
  getUserFromSessionToken(token: string): Promise<AuthSessionUser | null>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ ok: true } | { ok: false; error: string }>;
  // `devResetUrl` is only ever populated by providers with no real email
  // delivery (i.e. the local provider) — shown on-screen instead of emailed.
  // A Firebase-backed provider would send its own email and omit it.
  requestPasswordReset(email: string): Promise<{ ok: true; devResetUrl?: string } | { ok: false; error: string }>;
  resetPassword(token: string, newPassword: string): Promise<{ ok: true } | { ok: false; error: string }>;
}
