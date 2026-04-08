/**
 * app/(tabs)/matches.tsx — Messages Tab
 *
 * Responsibilities:
 *   - Shows the Neruo AI conversation row (navigates to /chat on tap)
 *   - Shows mutual matches from GET /matches/mine
 *   - Shows a "Discover people" shortcut to the Explore tab
 *   - Houses the Log Out button in a pinned footer
 */

import { useAuth } from "@/context/AuthProvider";
import { useChat } from "@/context/ChatContext";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Purple } from "@/constants/theme";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";

type MatchUser = {
  uid: string;
  first_name?: string;
  display_name?: string;
  photos?: string[];
  bio?: string;
};

function MatchProfileModal({ match, onClose }: { match: MatchUser | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  if (!match) return null;
  const name = match.first_name ?? match.display_name ?? "Match";
  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible onRequestClose={onClose}>
      <View style={[m.sheet, { paddingTop: insets.top > 0 ? insets.top : 16 }]}>
        <View style={m.header}>
          <Pressable style={m.closeBtn} onPress={onClose}>
            <Text style={m.closeTxt}>✕</Text>
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={m.content}>
          <View style={[m.avatar, { backgroundColor: Purple.primary }]}>
            {match.photos?.[0] ? (
              <Image source={{ uri: match.photos[0] }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <Text style={m.avatarInitial}>{name[0]}</Text>
            )}
          </View>
          <Text style={m.name}>{name}</Text>
          {match.bio ? <Text style={m.bio}>{match.bio}</Text> : null}
          <View style={[m.matchBadge]}>
            <Text style={m.matchBadgeText}>It's a match! ♥</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function MatchesScreen() {
  const { logout, token } = useAuth();
  const { messages } = useChat();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [matches, setMatches] = useState<MatchUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<MatchUser | null>(null);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/matches/mine`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

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

      {/* Mutual matches section */}
      {loading ? (
        <View style={s.matchesLoading}>
          <ActivityIndicator size="small" color={Purple.primary} />
        </View>
      ) : matches.length > 0 ? (
        <>
          <Text style={s.sectionTitle}>Mutual Matches</Text>
          <FlatList
            data={matches}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => {
              const name = item.first_name || item.display_name || "Match";
              return (
                <TouchableOpacity
                  style={s.row}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: "/conversation",
                      params: {
                        partnerUid: item.uid,
                        partnerName: name,
                        partnerPhoto: item.photos?.[0] ?? "",
                      },
                    } as any)
                  }
                  onLongPress={() => setSelectedMatch(item)}
                >
                  <View style={[s.avatar, { backgroundColor: "#e5e5e5" }]}>
                    {item.photos?.[0] ? (
                      <Image
                        source={{ uri: item.photos[0] }}
                        style={s.avatarImage}
                        contentFit="cover"
                      />
                    ) : (
                      <Text style={[s.avatarText, { color: "#999" }]}>
                        {name[0]}
                      </Text>
                    )}
                  </View>
                  <View style={s.rowBody}>
                    <Text style={s.rowName}>{name}</Text>
                    <Text style={s.rowPreview} numberOfLines={1}>
                      Tap to chat · hold to view profile
                    </Text>
                  </View>
                  <Text style={s.chevron}>›</Text>
                </TouchableOpacity>
              );
            }}
            style={s.matchesList}
          />
        </>
      ) : null}

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

      {selectedMatch && (
        <MatchProfileModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}
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
    overflow: "hidden",
  },
  avatarText: { fontSize: 20, fontWeight: "700", color: "#fff" },
  avatarImage: { width: 50, height: 50 },
  rowBody: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: "600", color: "#111" },
  rowPreview: { fontSize: 13, color: "#888" },
  rowTime: { fontSize: 12, color: "#bbb" },
  chevron: { fontSize: 22, color: "#ccc", fontWeight: "300" },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  matchesLoading: { padding: 20, alignItems: "center" },
  matchesList: { maxHeight: 300 },

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

const m = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 16, paddingBottom: 8 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" },
  closeTxt: { fontSize: 13, color: "#555", fontWeight: "600" },
  content: { paddingHorizontal: 24, paddingBottom: 48, gap: 12, alignItems: "center" },
  avatar: { width: "100%", height: 280, borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 80, fontWeight: "700", color: "#fff" },
  name: { fontSize: 26, fontWeight: "800", color: "#111", alignSelf: "flex-start" },
  bio: { fontSize: 15, color: "#444", lineHeight: 22, alignSelf: "flex-start" },
  matchBadge: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#86efac", borderRadius: 12, padding: 12, alignSelf: "stretch", alignItems: "center" },
  matchBadgeText: { color: "#166534", fontSize: 16, fontWeight: "700" },
});
