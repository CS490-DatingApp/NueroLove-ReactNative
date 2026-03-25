/**
 * components/chat-bubbles.tsx — Shared Chat UI Components
 *
 * TypingIndicator and MessageBubble are reused by both the AI onboarding
 * chat (app/onboarding.tsx) and the ongoing coaching chat (app/chat.tsx).
 * Centralising them here keeps the two screens in sync visually.
 */

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Purple } from "@/constants/theme";
import type { Message } from "@/types/chat";

/* ─── typing indicator ───────────────────────────────────────────────────── */

/** Three animated dots shown while the AI is generating a reply. */
export function TypingIndicator() {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={s.bubbleRow}>
      <View style={s.aiAvatar}>
        <Text style={s.aiAvatarText}>N</Text>
      </View>
      <View style={[s.bubble, s.bubbleAI, s.typingBubble]}>
        {dots.map((dot, i) => (
          <Animated.Text key={i} style={[s.typingDot, { opacity: dot }]}>
            •
          </Animated.Text>
        ))}
      </View>
    </View>
  );
}

/* ─── message bubble ─────────────────────────────────────────────────────── */

/** A single chat message. User messages appear on the right, AI on the left. */
export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <View style={[s.bubbleRow, isUser && s.bubbleRowUser]}>
      {!isUser && (
        <View style={s.aiAvatar}>
          <Text style={s.aiAvatarText}>N</Text>
        </View>
      )}
      <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}>
        <Text style={[s.bubbleText, isUser && s.bubbleTextUser]}>{message.text}</Text>
      </View>
    </View>
  );
}

/* ─── styles ─────────────────────────────────────────────────────────────── */

export const s = StyleSheet.create({
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 4 },
  bubbleRowUser: { flexDirection: "row-reverse" },

  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Purple.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  aiAvatarText: { fontSize: 12, fontWeight: "700", color: "#fff" },

  bubble: { maxWidth: "75%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleUser: { backgroundColor: Purple.primary, borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: "#f0f0f0", borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, color: "#111", lineHeight: 21 },
  bubbleTextUser: { color: "#fff" },

  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  typingDot: { fontSize: 18, color: "#888" },
});