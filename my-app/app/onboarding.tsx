/**
 * app/onboarding.tsx — AI Onboarding Chat Screen
 *
 * Responsibilities:
 *   - Gates app access: user must exchange at least MIN_EXCHANGES messages
 *     with the Neuro AI before they can enter the main app
 *   - Sends the full chat history to POST /chat/onboarding/save on completion,
 *     which persists the transcript and sets onboarding_completed = true
 *   - Calls markOnboardingComplete() to update local auth state immediately
 *
 * This screen lives at the root level (not inside (auth)/) so that
 * NavigationGuard can redirect here without triggering the auth layout.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Purple } from "@/constants/theme";
import { Button } from "@/components/ui/Button";
import { MessageBubble, TypingIndicator } from "@/components/chat-bubbles";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthProvider";
import type { Message } from "@/types/chat";

/* ─── Backend chat proxy ─────────────────────────────────────────────────── */

const MIN_EXCHANGES = 5;

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "ai",
  text: "Welcome to Neruo! I'm your personal AI companion. Before you dive in, I'd love to get to know you a little. What's something you're genuinely passionate about that you'd love to share with a partner?",
};

async function fetchAIReply(
  history: Message[],
  token: string | null,
  interests: string[],
): Promise<string> {
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      messages: history.map((m) => ({ role: m.role === "ai" ? "assistant" : "user", text: m.text })),
      context: "onboarding",
      interests,
    }),
  });
  if (!res.ok) throw new Error("Chat request failed");
  const data = await res.json();
  return data.text ?? "That's really interesting! Tell me more about yourself.";
}

/* ─── main screen ────────────────────────────────────────────────────────── */

export default function OnboardingChat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const { messages, appendMessage } = useChat();
  const { token, markOnboardingComplete } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userReplyCount, setUserReplyCount] = useState(0);
  // Interests fetched from the user's saved profile — given to the AI as context
  const [interests, setInterests] = useState<string[]>([]);

  // On mount: seed welcome message and fetch the user's profile to get interests
  useEffect(() => {
    if (messages.length === 0) {
      appendMessage(WELCOME_MESSAGE);
    }
    (async () => {
      try {
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/profiles/me`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const profile = await res.json();
          if (Array.isArray(profile.interests)) setInterests(profile.interests);
        }
      } catch {
        // Non-fatal — AI will work without interests context
      }
    })();
  }, []);

  const canEnterApp = userReplyCount >= MIN_EXCHANGES;

  const handleEnterApp = async () => {
    setIsSaving(true);
    try {
      const payload = messages.map((m) => ({
        role: m.role === "ai" ? "assistant" : "user",
        text: m.text,
      }));
      await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/chat/onboarding/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: payload }),
      });
    } catch {
      // Non-fatal — still let user in; the flag will sync on next login
    } finally {
      await markOnboardingComplete();
      router.replace("/(tabs)");
    }
  };

  const scrollToEnd = () => listRef.current?.scrollToEnd({ animated: true });

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    const history = [...messages, userMsg];

    appendMessage(userMsg);
    setInputText("");
    setIsTyping(true);
    setUserReplyCount((c) => c + 1);

    try {
      const reply = await fetchAIReply(history, token, interests);
      appendMessage({ id: (Date.now() + 1).toString(), role: "ai", text: reply });
    } catch {
      appendMessage({
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: "I had a small hiccup! Could you say that again?",
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Meet Neruo AI</Text>
        <Text style={s.headerSub}>
          {canEnterApp
            ? "You're all set — welcome to Neruo!"
            : `Chat a little before you explore · ${userReplyCount}/${MIN_EXCHANGES}`}
        </Text>
      </View>

      {/* Progress dots */}
      <View style={s.progressRow}>
        {Array.from({ length: MIN_EXCHANGES }).map((_, i) => (
          <View
            key={i}
            style={[s.progressSegment, i < userReplyCount && s.progressSegmentDone]}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={s.listContent}
          onContentSizeChange={scrollToEnd}
          onLayout={scrollToEnd}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
        />

        {/* Unlock banner */}
        {canEnterApp && (
          <View style={s.unlockBanner}>
            <Button
              label="Start exploring Neruo →"
              loadingLabel="Saving…"
              loading={isSaving}
              onPress={handleEnterApp}
              style={s.unlockButton}
            />
          </View>
        )}

        {/* Input bar */}
        <View style={[s.inputBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
          <TextInput
            style={[s.textInput, { maxHeight: 120 }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={canEnterApp ? "Keep chatting or tap above…" : "Type a message…"}
            placeholderTextColor="#aaa"
            multiline
            returnKeyType="send"
            submitBehavior="blurAndSubmit"
            onSubmitEditing={handleSend}
          />
          <Pressable
            style={[s.sendButton, (!inputText.trim() || isTyping) && s.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isTyping}
          >
            <Text style={s.sendButtonText}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─── styles ─────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#111" },
  headerSub: { fontSize: 13, color: "#888", marginTop: 2 },

  progressRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 99,
    backgroundColor: "#e5e5e5",
  },
  progressSegmentDone: { backgroundColor: Purple.primary },

  listContent: { padding: 16, gap: 12, paddingBottom: 8 },

  unlockBanner: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e5e5",
    backgroundColor: "#fff",
  },
  unlockButton: { flex: undefined },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e5e5",
    backgroundColor: "#fff",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111",
    backgroundColor: "#fafafa",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Purple.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { backgroundColor: "#ccc" },
  sendButtonText: { fontSize: 18, color: "#fff", fontWeight: "700" },
});
