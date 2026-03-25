/**
 * app/(tabs)/explore.tsx — Discover / Explore Screen
 *
 * Responsibilities:
 *   - Fetches potential matches from GET /matches/discover
 *   - Falls back to MOCK_PROFILES if the API is unavailable
 *   - Computes a compatibility % based on shared interests (Jaccard index)
 *   - Tapping a card opens a ProfileDetailModal with a Like button
 *
 * Style objects are split by sub-component scope:
 *   s  — main screen layout
 *   g  — ProfileGridCard component
 *   md — ProfileDetailModal component
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Purple } from "@/constants/theme";
import { useAuth } from "@/context/AuthProvider";

/* ─── types ──────────────────────────────────────────────────────────────── */

type Profile = {
  id: string;
  name: string;
  age: number;
  city: string;
  bio: string;
  interests: string[];
  avatarColor: string;
  photoUri?: string;
  jobTitle?: string;
  compatibility?: number;
};

/* ─── mock data ──────────────────────────────────────────────────────────── */

const MOCK_PROFILES: Profile[] = [
  {
    id: "1",
    name: "Sofia",
    age: 26,
    city: "Los Angeles, CA",
    bio: "Coffee lover, weekend hiker, and part-time chef. Looking for someone to explore the city with.",
    interests: ["Hiking", "Cooking", "Travel"],
    avatarColor: "#f59e0b",
    jobTitle: "UX Designer",
  },
  {
    id: "2",
    name: "Jordan",
    age: 29,
    city: "Santa Monica, CA",
    bio: "Creative director by day, surfer at dawn. Big believer in spontaneous road trips and good playlists.",
    interests: ["Surfing", "Art", "Music"],
    avatarColor: "#10b981",
    jobTitle: "Creative Director",
  },
  {
    id: "3",
    name: "Maya",
    age: 24,
    city: "Pasadena, CA",
    bio: "PhD student studying neuroscience. I balance lab life with yoga, bookstores, and terrible puns.",
    interests: ["Reading", "Yoga", "Science"],
    avatarColor: "#ec4899",
    jobTitle: "PhD Student",
  },
  {
    id: "4",
    name: "Alex",
    age: 31,
    city: "Venice Beach, CA",
    bio: "Architect and amateur photographer. Always looking for interesting light and interesting people.",
    interests: ["Photography", "Architecture", "Coffee"],
    avatarColor: "#6366f1",
    jobTitle: "Architect",
  },
  {
    id: "5",
    name: "Riley",
    age: 27,
    city: "Silver Lake, CA",
    bio: "Musician and dog dad. I play bass in a band on weekends and make great breakfast burritos.",
    interests: ["Music", "Dogs", "Cooking"],
    avatarColor: "#ef4444",
    jobTitle: "Music Teacher",
  },
  {
    id: "6",
    name: "Casey",
    age: 28,
    city: "Burbank, CA",
    bio: "Film editor with a soft spot for horror movies and farmers markets. Fluent in sarcasm.",
    interests: ["Film", "Food", "Travel"],
    avatarColor: "#0ea5e9",
    jobTitle: "Film Editor",
  },
];

/* ─── helpers ────────────────────────────────────────────────────────────── */

function calcCompatibility(myInterests: string[], theirInterests: string[]): number {
  if (!myInterests.length && !theirInterests.length) return 0;
  const shared = myInterests.filter((i) => theirInterests.includes(i)).length;
  const union = new Set([...myInterests, ...theirInterests]).size;
  return Math.round((shared / union) * 100);
}

function badgeColor(pct: number): string {
  if (pct >= 70) return "#10b981";
  if (pct >= 40) return Purple.primary;
  return "#9ca3af";
}

/* ─── grid dimensions ────────────────────────────────────────────────────── */

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_GAP = 12;
const H_PAD = 12;
const CARD_W = (SCREEN_W - H_PAD * 2 - CARD_GAP) / 2;
const AVATAR_H = 150;

/* ─── grid card ──────────────────────────────────────────────────────────── */

function ProfileGridCard({
  profile,
  onPress,
}: {
  profile: Profile;
  onPress: () => void;
}) {
  const pct = profile.compatibility ?? 0;

  return (
    <TouchableOpacity style={g.card} activeOpacity={0.88} onPress={onPress}>
      <View style={[g.photoArea, { backgroundColor: profile.avatarColor }]}>
        {profile.photoUri ? (
          <Image
            source={{ uri: profile.photoUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : (
          <Text style={g.initial}>{profile.name[0]}</Text>
        )}
        <View style={g.photoOverlay} />
      </View>

      <View style={g.info}>
        <Text style={g.name} numberOfLines={1}>
          {profile.name}, {profile.age}
        </Text>
        {pct > 0 && (
          <View style={[g.badge, { backgroundColor: badgeColor(pct) }]}>
            <Text style={g.badgeText}>{pct}%</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/* ─── profile detail modal ───────────────────────────────────────────────── */

function ProfileDetailModal({
  profile,
  onClose,
  token,
}: {
  profile: Profile | null;
  onClose: () => void;
  token: string | null;
}) {
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setLiked(false);
  }, [profile?.id]);

  const handleLike = async () => {
    if (!profile || liking) return;
    setLiking(true);
    try {
      await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/matches/${profile.id}/like`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      setLiked(true);
    } catch {
      setLiked((v) => !v);
    } finally {
      setLiking(false);
    }
  };

  if (!profile) return null;

  const pct = profile.compatibility ?? 0;

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible
      onRequestClose={onClose}
    >
      <View style={[md.sheet, { paddingTop: insets.top > 0 ? insets.top : 16 }]}>
        <View style={md.header}>
          <Pressable style={md.closeBtn} onPress={onClose}>
            <Text style={md.closeTxt}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={md.content}
        >
          <View style={[md.heroAvatar, { backgroundColor: profile.avatarColor }]}>
            {profile.photoUri ? (
              <Image
                source={{ uri: profile.photoUri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
            ) : (
              <Text style={md.heroInitial}>{profile.name[0]}</Text>
            )}
          </View>

          <Text style={md.name}>
            {profile.name}, {profile.age}
          </Text>
          <Text style={md.location}>📍 {profile.city}</Text>
          {profile.jobTitle ? (
            <Text style={md.jobTitle}>{profile.jobTitle}</Text>
          ) : null}

          {pct > 0 && (
            <View style={[md.compatBadge, { backgroundColor: badgeColor(pct) }]}>
              <Text style={md.compatText}>{pct}% match</Text>
            </View>
          )}

          {profile.bio ? (
            <View style={md.section}>
              <Text style={md.sectionTitle}>About</Text>
              <Text style={md.bio}>{profile.bio}</Text>
            </View>
          ) : null}

          {profile.interests.length > 0 && (
            <View style={md.section}>
              <Text style={md.sectionTitle}>Interests</Text>
              <View style={md.chips}>
                {profile.interests.map((tag) => (
                  <View key={tag} style={md.chip}>
                    <Text style={md.chipText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <Button
            label={liked ? "♥  Liked!" : "♡  Like"}
            variant={liked ? "secondary" : "primary"}
            loading={liking}
            onPress={handleLike}
            style={md.likeBtn}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ─── main screen ────────────────────────────────────────────────────────── */

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Profile | null>(null);

  const myInterests: string[] = user?.interests ?? [];

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/matches/discover`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) throw new Error("not ok");
      const data: any[] = await res.json();
      if (!data.length) throw new Error("empty");

      const mapped: Profile[] = data.map((p) => ({
        id: String(p.id ?? p.user_id),
        name: p.first_name ?? p.name ?? "?",
        age: p.age ?? 0,
        city: [p.city, p.state].filter(Boolean).join(", "),
        bio: p.bio ?? "",
        interests: p.interests ?? [],
        avatarColor: "#7C3AED",
        photoUri: p.photos?.[0] ?? undefined,
        jobTitle: p.job_title ?? undefined,
      }));

      setProfiles(
        mapped.map((p) => ({
          ...p,
          compatibility: calcCompatibility(myInterests, p.interests),
        })),
      );
    } catch {
      setProfiles(
        MOCK_PROFILES.map((p) => ({
          ...p,
          compatibility: calcCompatibility(myInterests, p.interests),
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [token, myInterests.join(",")]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Discover"
        subtitle={loading ? "Loading…" : `${profiles.length} people nearby`}
      />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Purple.primary} />
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={s.columnWrapper}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProfileGridCard profile={item} onPress={() => setSelected(item)} />
          )}
        />
      )}

      {selected && (
        <ProfileDetailModal
          profile={selected}
          onClose={() => setSelected(null)}
          token={token}
        />
      )}
    </View>
  );
}

/* ─── styles ─────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: H_PAD, paddingTop: CARD_GAP, paddingBottom: 24, gap: CARD_GAP },
  columnWrapper: { gap: CARD_GAP },
});

const g = StyleSheet.create({
  card: {
    width: CARD_W,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  photoArea: {
    height: AVATAR_H,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { fontSize: 56, fontWeight: "700", color: "#fff" },
  photoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  info: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: "#fff",
    gap: 4,
  },
  name: { fontSize: 13, fontWeight: "700", color: "#111", flex: 1 },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    flexShrink: 0,
  },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },
});

const md = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  closeTxt: { fontSize: 13, color: "#555", fontWeight: "600" },
  content: { paddingHorizontal: 24, paddingBottom: 48, gap: 12 },
  heroAvatar: {
    width: "100%",
    height: 260,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroInitial: { fontSize: 80, fontWeight: "700", color: "#fff" },
  name: { fontSize: 26, fontWeight: "800", color: "#111" },
  location: { fontSize: 14, color: "#888" },
  jobTitle: { fontSize: 14, color: "#666" },
  compatBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 2,
  },
  compatText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  section: { gap: 8, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111" },
  bio: { fontSize: 15, color: "#444", lineHeight: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: Purple.faint,
    borderWidth: 1,
    borderColor: Purple.border,
  },
  chipText: { fontSize: 13, color: Purple.primary, fontWeight: "600" },
  likeBtn: { marginTop: 12 },
});
