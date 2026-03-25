/**
 * types/auth.ts — Authentication types
 *
 * User is null when not logged in.
 * AuthContextType mirrors the value exposed by AuthProvider.
 */

/**
 * Core user object stored in SecureStore and returned by the auth endpoints.
 * Optional fields are populated once the user completes their profile
 * (POST /profiles/me) and are available on subsequent logins.
 */
export type User = {
  id: string;
  email: string;
  onboarding_completed: boolean;
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
  login: (token: string, user: NonNullable<User>) => Promise<void>;
  register: (token: string, user: NonNullable<User>) => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
  logout: () => Promise<void>;
};
