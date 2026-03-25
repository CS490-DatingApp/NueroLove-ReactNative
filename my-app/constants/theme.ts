/**
 * constants/theme.ts — Design Tokens
 *
 * Neruo brand palette, semantic color tokens (light/dark), and
 * platform-appropriate font stacks.
 *
 * Usage:
 *   import { Purple } from "@/constants/theme"  — component-level brand colors
 *   import { Colors } from "@/constants/theme"  — theme-aware text / bg / tint
 */

import { Platform } from "react-native";

// ─── Neruo brand palette ─────────────────────────────────────────────────────
export const Purple = {
  /** Primary CTA, active tabs, buttons */
  primary: "#7C3AED",
  /** Pressed / hover state */
  dark: "#6D28D9",
  /** Lighter accent */
  light: "#8B5CF6",
  /** Subtle backgrounds */
  faint: "#F5F3FF",
  /** Border / divider */
  border: "#DDD6FE",
  /** Dark-mode tint */
  darkTint: "#A78BFA",
} as const;

// ─── Semantic color tokens ───────────────────────────────────────────────────
export const Colors = {
  light: {
    text: "#1a1a2e",
    background: "#ffffff",
    tint: Purple.primary,
    icon: "#6b7280",
    tabIconDefault: "#9ca3af",
    tabIconSelected: Purple.primary,
  },
  dark: {
    text: "#f5f3ff",
    background: "#0f0d1a",
    tint: Purple.darkTint,
    icon: "#9ca3af",
    tabIconDefault: "#6b7280",
    tabIconSelected: Purple.darkTint,
  },
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────
export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
