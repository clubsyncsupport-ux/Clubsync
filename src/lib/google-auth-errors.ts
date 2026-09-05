const GOOGLE_AUTH_ERRORS: Record<string, string> = {
  google_cancelled: "Google sign-in was cancelled.",
  google_failed: "Google sign-in didn't work. Please try again, or use email below.",
  google_not_configured: "Google sign-in isn't set up yet. Please use email below.",
  google_unverified_email: "That Google account's email isn't verified. Please use email below.",
  google_consent_required: "You must agree to the Privacy Policy and Terms of Use to create an account.",
};

export function resolveGoogleAuthError(code: string | undefined): string | null {
  if (!code) return null;
  return GOOGLE_AUTH_ERRORS[code] ?? null;
}
