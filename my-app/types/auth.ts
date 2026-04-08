/**
 * types/auth.ts — Authentication types
 *
 * User is null when not logged in.
 * AuthContextType mirrors the value exposed by AuthProvider.
 */

/**
 * Core user object stored in SecureStore and returned by the auth endpoints.
 * Uses Firebase UID (uid) as the primary identifier.
 * Optional fields are populated once the user completes their profile
 * (POST /profiles/me) and are available on subsequent logins.
 */
export type User = {
  uid: string;
  email: string;
  onboarding_completed: boolean;
  display_name?: string;
  // Optional profile fields the backend may include
  first_name?: string;
  last_name?: string;
  bio?: string;
  city?: string;
  state?: string;
  job_title?: string;
  school?: string;
  height_cm?: number | null;
  pronouns?: string;
  looking_for?: string;
  interests?: string[];
  photos?: string[];
} | null;

export type AuthContextType = {
  user: User;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: NonNullable<User>, refreshToken?: string) => Promise<void>;
  register: (token: string, user: NonNullable<User>, refreshToken?: string) => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
  logout: () => Promise<void>;
};
