/**
 * app/chat.tsx — AI Coaching Chat Screen
 *
 * Responsibilities:
 *   - Ongoing AI chat available from the Messages tab and Home screen
 *   - Shares the same ChatContext message list as onboarding (history carries over)
 *   - Calls POST /chat with context: "coaching"
 *   - Header is rendered by the Stack navigator (headerShown: true set inline)
 */

import { useHeaderHeight } from "@react-navigation/elements";
import { Stack } from "expo-router";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Purple } from "@/constants/theme";
import { MessageBubble, TypingIndicator } from "@/components/chat-bubbles";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthProvider";
import type { Message } from "@/types/chat";

/* ─── Backend chat proxy ─────────────────────────────────────────────────── */

async function fetchAIReply(history: Message[], token: string | null): Promise<string> {
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      messages: history.map((m) => ({ role: m.role === "ai" ? "assistant" : "user", text: m.text })),
      context: "coaching",
    }),
  });
  if (!res.ok) throw new Error("Chat request failed");
  const data = await res.json();
  return data.text ?? "Sorry, I couldn't respond right now. Please try again.";
}

/* ─── constants ──────────────────────────────────────────────────────────── */

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "ai",
  text: "Hi! I'm your Neruo AI coach powered by GPT-4o. Ask me anything about your bio, photos, opening messages, date ideas, and more.",
};

/* ─── main screen ────────────────────────────────────────────────────────── */

export default function ChatScreen() {
  const { messages, appendMessage } = useChat();
  const { token } = useAuth();
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  // If no prior conversation (user skipped onboarding), seed the welcome message
  useEffect(() => {
    if (messages.length === 0) {
      appendMessage(WELCOME_MESSAGE);
    }
  }, []);

  const scrollToEnd = () => listRef.current?.scrollToEnd({ animated: true });

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    const history = [...messages, userMsg];

    appendMessage(userMsg);
    setInputText("");
    setIsTyping(true);

    try {
      const reply = await fetchAIReply(history, token);
      appendMessage({ id: (Date.now() + 1).toString(), role: "ai", text: reply });
    } catch {
      appendMessage({
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: "Something went wrong. Check your connection and try again.",
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Neruo AI",
          headerBackTitle: "Messages",
          headerTintColor: Purple.primary,
        }}
      />
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={headerHeight}
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

        <View style={[s.inputBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
          <TextInput
            style={[s.textInput, { maxHeight: 120 }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything…"
            placeholderTextColor="#aaa"
            multiline
            onSubmitEditing={handleSend}
            returnKeyType="send"
            submitBehavior="blurAndSubmit"
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
    </>
  );
}

/* ─── styles ─────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  listContent: { padding: 16, gap: 12, paddingBottom: 8 },

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
