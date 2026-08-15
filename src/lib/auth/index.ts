import { localAuthProvider } from "./local-provider";
import type { AuthProvider } from "./types";

// The single switch for the entire app's auth backend.
// Swap to a Firebase-backed provider later by changing this one line
// (e.g. `export const authProvider: AuthProvider = firebaseAuthProvider;`).
export const authProvider: AuthProvider = localAuthProvider;

export type { AuthProvider, AuthResult, AuthSessionUser, SignInInput, SignUpInput } from "./types";
