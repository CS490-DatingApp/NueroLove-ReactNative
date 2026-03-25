/**
 * constants/profile.ts — Profile Form Constants
 *
 * Single source of truth for all fixed option lists and numeric limits
 * used across sign-up.tsx and settings.tsx.
 */

import type { Gender, LookingFor, Orientation } from "@/types/profile";

export const GENDERS: Gender[] = ["Man", "Woman", "Non-binary", "Other"];

export const ORIENTATIONS: Orientation[] = [
  "Straight",
  "Gay",
  "Lesbian",
  "Bisexual",
  "Pansexual",
  "Asexual",
  "Other",
];

export const LOOKING_FOR: LookingFor[] = [
  "Relationship",
  "Something casual",
  "New friends",
  "Not sure yet",
];

export const INTEREST_OPTIONS = [
  // Active & Sports
  "Gym", "Running", "Yoga", "Hiking", "Cycling", "Swimming",
  "Tennis", "Basketball", "Soccer", "Volleyball", "Rock Climbing",
  "Surfing", "Skiing", "Martial Arts", "Dancing",

  // Outdoors & Travel
  "Travel", "Outdoors", "Camping", "Fishing", "Photography",

  // Food & Drink
  "Coffee", "Cooking", "Baking", "Wine", "Beer", "Foodie",
  "Sushi", "Brunch", "Veganism",

  // Entertainment
  "Music", "Concerts", "Festivals", "Movies", "Netflix", "Podcasts",
  "Theater", "Stand-up Comedy", "Anime", "Karaoke",

  // Arts & Creativity
  "Art", "Fashion", "Interior Design", "DIY & Crafts", "Gardening", "Tattoos",

  // Mindfulness & Wellness
  "Meditation", "Spirituality", "Astrology", "Journaling", "Wellness",

  // Social & Games
  "Board Games", "Chess", "Gaming", "Trivia",

  // Learning & Growth
  "Reading", "Language Learning", "Tech", "Investing",
  "Entrepreneurship", "Volunteering", "Sustainability",

  // Lifestyle
  "Dogs", "Cats", "Vintage", "Thrift Shopping", "Cars", "Sneakers",
] as const;

export const PHOTO_SLOTS = 6;
export const MAX_INTERESTS = 12;
export const TOTAL_STEPS = 5;

export const STEP_TITLES = ["Create account", "The basics", "About you", "Interests", "Photos"];
