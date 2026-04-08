/**
 * app/conversation.tsx — 1-on-1 Chat Screen
 *
 * Opened from the Matches tab when tapping a mutual match.
 * URL params: partnerUid, partnerName, partnerPhoto (optional)
 *
 * Polls GET /conversations/{partnerUid} every 3s for new messages.
 * Sends via POST /conversations/{partnerUid}.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Purple } from "@/constants/theme";
import { useAuth } from "@/context/AuthProvider";

type Message = {
  id: string;
  sender_uid: string;
  text: string;
  created_at: string;
  is_mine: boolean;
};

export default function ConversationScreen() {
  const { partnerUid, partnerName, partnerPhoto } = useLocalSearchParams<{
    partnerUid: string;
    partnerName: string;
    partnerPhoto?: string;
  }>();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const base = process.env.EXPO_PUBLIC_API_BASE_URL;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${base}/conversations/${partnerUid}`, {
        headers: authHeader,
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  }, [partnerUid, token]);

  // Initial load
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Poll every 3 seconds
  useEffect(() => {
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const scrollToEnd = () =>
    listRef.current?.scrollToEnd({ animated: true });

  useEffect(() => {
    if (messages.length > 0) scrollToEnd();
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    // Optimistic update
    const optimistic: Message = {
      id: `temp_${Date.now()}`,
      sender_uid: user?.uid ?? "",
      text,
      created_at: new Date().toISOString(),
      is_mine: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setSending(true);

    try {
      await fetch(`${base}/conversations/${partnerUid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ text }),
      });
      // Fetch real messages to replace optimistic
      await fetchMessages();
    } catch {
      // Remove optimistic on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: () => (
            <View style={s.headerTitle}>
              <View style={s.headerAvatar}>
                {partnerPhoto ? (
                  <Image
                    source={{ uri: partnerPhoto }}
                    style={s.headerAvatarImg}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={s.headerAvatarInitial}>
                    {partnerName?.[0] ?? "?"}
                  </Text>
                )}
              </View>
              <Text style={s.headerName}>{partnerName}</Text>
            </View>
          ),
          headerTintColor: Purple.primary,
          headerBackTitle: "Matches",
        }}
      />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color={Purple.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={s.listContent}
            onContentSizeChange={scrollToEnd}
            ListEmptyComponent={
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>
                  Say hi to {partnerName}! 👋
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View
                style={[
                  s.bubble,
                  item.is_mine ? s.bubbleMine : s.bubbleTheirs,
                ]}
              >
                <Text
                  style={[
                    s.bubbleText,
                    item.is_mine ? s.bubbleTextMine : s.bubbleTextTheirs,
                  ]}
                >
                  {item.text}
                </Text>
              </View>
            )}
          />
        )}

        <View
          style={[
            s.inputBar,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 },
          ]}
        >
          <TextInput
            style={[s.input, { maxHeight: 120 }]}
            value={input}
            onChangeText={setInput}
            placeholder={`Message ${partnerName}…`}
            placeholderTextColor="#aaa"
            multiline
            returnKeyType="send"
            submitBehavior="blurAndSubmit"
            onSubmitEditing={handleSend}
          />
          <Pressable
            style={[s.sendBtn, (!input.trim() || sending) && s.sendBtnOff]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            <Text style={s.sendBtnText}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  headerTitle: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Purple.primary,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarImg: { width: 34, height: 34 },
  headerAvatarInitial: { fontSize: 15, fontWeight: "700", color: "#fff" },
  headerName: { fontSize: 16, fontWeight: "700", color: "#111" },

  listContent: {
    padding: 16,
    gap: 8,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyText: { fontSize: 15, color: "#aaa" },

  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: Purple.primary,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f0",
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMine: { color: "#fff" },
  bubbleTextTheirs: { color: "#111" },

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
  input: {
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
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Purple.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnOff: { backgroundColor: "#ccc" },
  sendBtnText: { fontSize: 18, color: "#fff", fontWeight: "700" },
});
