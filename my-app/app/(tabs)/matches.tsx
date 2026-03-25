/**
 * app/(tabs)/matches.tsx — Messages Tab
 *
 * Responsibilities:
 *   - Shows the Neruo AI conversation row (navigates to /chat on tap)
 *   - Shows a "Discover people" shortcut to the Explore tab
 *   - Houses the Log Out button in a pinned footer
 */

import { useAuth } from "@/context/AuthProvider";
import { useChat } from "@/context/ChatContext";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Purple } from "@/constants/theme";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MatchesScreen() {
  const { logout } = useAuth();
  const { messages } = useChat();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const lastMessage = messages.at(-1);
  const preview = lastMessage
    ? lastMessage.text
    : "Hi! I'm here to help you make great connections.";

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title="Messages" />

      {/* Neruo AI row */}
      <TouchableOpacity
        style={s.row}
        activeOpacity={0.7}
        onPress={() => router.push("/chat" as any)}
      >
        <View style={[s.avatar, { backgroundColor: Purple.primary }]}>
          <Text style={s.avatarText}>N</Text>
        </View>
        <View style={s.rowBody}>
          <Text style={s.rowName}>Neruo AI</Text>
          <Text style={s.rowPreview} numberOfLines={1}>
            {preview}
          </Text>
        </View>
        <Text style={s.rowTime}>now</Text>
      </TouchableOpacity>

      {/* Discover link */}
      <Pressable
        style={s.discoverLink}
        onPress={() => router.push("/(tabs)/explore" as any)}
      >
        <Text style={s.discoverText}>Discover people →</Text>
      </Pressable>

      {/* Footer */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          label="Log Out"
          variant="ghost"
          onPress={async () => { await logout(); }}
          style={s.logoutButton}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f0f0",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "700", color: "#fff" },
  rowBody: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: "600", color: "#111" },
  rowPreview: { fontSize: 13, color: "#888" },
  rowTime: { fontSize: 12, color: "#bbb" },

  discoverLink: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  discoverText: {
    fontSize: 14,
    color: Purple.primary,
    fontWeight: "600",
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e5e5",
    backgroundColor: "#fff",
  },
  logoutButton: { borderWidth: 0 },
});
