/**
 * app/(tabs)/index.tsx — Home Screen
 *
 * Landing screen after login. Displays a greeting, quick-action cards,
 * and a tip banner. All navigation is handled by pushing to other tabs
 * or to /chat.
 */

import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthProvider";
import { Purple } from "@/constants/theme";

type QuickCard = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  onPress: () => void;
  color: string;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Derive a friendly display name from the email
  const firstName = user?.email.split("@")[0] ?? "there";

  const cards: QuickCard[] = [
    {
      id: "ai",
      emoji: "✦",
      title: "Neruo AI Coach",
      description: "Get help with your bio, openers & first dates",
      onPress: () => router.push("/chat" as any),
      color: Purple.primary,
    },
    {
      id: "discover",
      emoji: "◈",
      title: "Discover",
      description: "Browse potential matches near you",
      onPress: () => router.push("/(tabs)/explore" as any),
      color: "#10b981",
    },
    {
      id: "messages",
      emoji: "◎",
      title: "Messages",
      description: "Continue conversations with your matches",
      onPress: () => router.push("/(tabs)/matches" as any),
      color: "#f59e0b",
    },
  ];

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[
        s.content,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Brand header */}
      <View style={s.header}>
        <Text style={s.brandName}>neuro</Text>
        <Text style={s.greeting}>Hey, {firstName} 👋</Text>
        <Text style={s.tagline}>Ready to make a real connection?</Text>
      </View>

      {/* Quick action cards */}
      <Text style={s.sectionTitle}>Quick Actions</Text>
      <View style={s.cards}>
        {cards.map((card) => (
          <Pressable
            key={card.id}
            style={({ pressed }) => [s.card, pressed && s.cardPressed]}
            onPress={card.onPress}
          >
            <View style={[s.cardIcon, { backgroundColor: card.color }]}>
              <Text style={s.cardIconText}>{card.emoji}</Text>
            </View>
            <View style={s.cardBody}>
              <Text style={s.cardTitle}>{card.title}</Text>
              <Text style={s.cardDesc}>{card.description}</Text>
            </View>
            <Text style={s.cardArrow}>›</Text>
          </Pressable>
        ))}
      </View>

      {/* Tip banner */}
      <View style={s.tipBanner}>
        <Text style={s.tipLabel}>TIP</Text>
        <Text style={s.tipText}>
          Profiles with 3+ photos get 2× more matches. Head to your profile to add photos.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { paddingHorizontal: 20 },

  // Header
  header: { marginBottom: 32 },
  brandName: {
    fontSize: 32,
    fontWeight: "800",
    color: Purple.primary,
    letterSpacing: -1,
    marginBottom: 8,
  },
  greeting: { fontSize: 26, fontWeight: "700", color: "#111", marginBottom: 4 },
  tagline: { fontSize: 15, color: "#666" },

  // Section
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#999",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  // Cards
  cards: { gap: 10, marginBottom: 28 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardPressed: { opacity: 0.75 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconText: { fontSize: 20, color: "#fff" },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111" },
  cardDesc: { fontSize: 13, color: "#888" },
  cardArrow: { fontSize: 22, color: "#ccc", fontWeight: "300" },

  // Tip banner
  tipBanner: {
    backgroundColor: Purple.faint,
    borderRadius: 14,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: Purple.border,
  },
  tipLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Purple.primary,
    letterSpacing: 1.2,
  },
  tipText: { fontSize: 13, color: "#555", lineHeight: 19 },
});
