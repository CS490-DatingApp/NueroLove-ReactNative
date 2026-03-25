/**
 * types/profile.ts — Profile domain types
 *
 * ProfileFormValues: the Formik form state (all fields start as strings).
 * ProfilePayload: the cleaned object sent to POST /profiles/me.
 */

export type Gender = "Man" | "Woman" | "Non-binary" | "Other";
export type Orientation =
  | "Straight"
  | "Gay"
  | "Lesbian"
  | "Bisexual"
  | "Pansexual"
  | "Asexual"
  | "Other";
export type LookingFor =
  | "Relationship"
  | "Something casual"
  | "New friends"
  | "Not sure yet";

export type ProfileFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  age: string;
  gender: Gender | "";
  genderOther: string;
  orientation: Orientation | "";
  orientationOther: string;
  pronouns: string;
  bio: string;
  city: string;
  state: string;
  jobTitle: string;
  school: string;
  heightCm: string;
  lookingFor: LookingFor | "";
  interests: string[];
  photos: string[];
};

export type ProfilePayload = {
  firstName: string;
  lastName?: string;
  age: number;
  gender: string;
  orientation: string;
  pronouns?: string;
  bio?: string;
  city?: string;
  state?: string;
  jobTitle?: string;
  school?: string;
  heightCm?: number | null;
  lookingFor?: string;
  interests: string[];
  photos: string[];
};
