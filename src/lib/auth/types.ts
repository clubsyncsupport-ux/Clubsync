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

export type AuthResult =
  | { ok: true; user: AuthSessionUser; sessionToken: string; expiresAt: Date }
  | { ok: false; error: string };

export interface AuthProvider {
  signUp(input: SignUpInput): Promise<AuthResult>;
  signIn(input: SignInInput): Promise<AuthResult>;
  signOut(sessionToken: string): Promise<void>;
  getUserFromSessionToken(token: string): Promise<AuthSessionUser | null>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ ok: true } | { ok: false; error: string }>;
  // `devResetUrl` is only ever populated by providers with no real email
  // delivery (i.e. the local provider) — shown on-screen instead of emailed.
  // A Firebase-backed provider would send its own email and omit it.
  requestPasswordReset(email: string): Promise<{ ok: true; devResetUrl?: string } | { ok: false; error: string }>;
  resetPassword(token: string, newPassword: string): Promise<{ ok: true } | { ok: false; error: string }>;
}
