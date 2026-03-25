/**
 * types/chat.ts — Chat message types
 *
 * Shared across ChatContext, onboarding.tsx, and chat.tsx.
 */

export type MessageRole = "user" | "ai";

export type Message = {
  id: string;
  role: MessageRole;
  text: string;
};
