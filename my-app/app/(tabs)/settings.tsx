/**
 * app/(tabs)/settings.tsx — Profile / Settings Screen
 *
 * Responsibilities:
 *   - Fetches the user's saved profile from GET /profiles/me on mount
 *   - Lets the user edit bio, location, job, interests, and photos
 *   - Saves changes to POST /profiles/me (only shown when form is dirty)
 *   - Houses the Log Out button under the Account section
 *
 * Style objects are split by sub-component scope:
 *   s  — main screen layout
 *   ps — PhotoSlot component
 *   cs — ChipSelect component
 *   sec — SectionTitle component
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Purple } from "@/constants/theme";
import { useAuth } from "@/context/AuthProvider";
import {
  INTEREST_OPTIONS,
  LOOKING_FOR,
  MAX_INTERESTS,
  PHOTO_SLOTS,
} from "@/constants/profile";
import type { LookingFor } from "@/types/profile";

/* ─── dimensions ─────────────────────────────────────────────────────────── */

const { width: W } = Dimensions.get("window");
const SLOT_SIZE = (W - 40 - 16) / 3;

/* ─── photo slot ─────────────────────────────────────────────────────────── */

function PhotoSlot({
  uri,
  index,
  onPick,
  onRemove,
}: {
  uri: string;
  index: number;
  onPick: (i: number) => void;
  onRemove: (i: number) => void;
}) {
  if (uri) {
    return (
      <Pressable
        style={ps.slot}
        onPress={() =>
          Alert.alert("Photo", undefined, [
            { text: "Change", onPress: () => onPick(index) },
            { text: "Remove", style: "destructive", onPress: () => onRemove(index) },
            { text: "Cancel", style: "cancel" },
          ])
        }
      >
        <Image source={{ uri }} style={ps.image} contentFit="cover" />
        <View style={ps.badge}>
          <Text style={ps.badgeText}>✕</Text>
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable
      style={[ps.slot, ps.empty, Platform.OS === "android" && { borderStyle: "solid" }]}
      onPress={() => onPick(index)}
    >
      <Text style={ps.plus}>+</Text>
      {index === 0 && <Text style={ps.label}>MAIN</Text>}
    </Pressable>
  );
}

/* ─── chip selectors ─────────────────────────────────────────────────────── */

function ChipSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | "";
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={cs.row}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[cs.chip, active && cs.chipActive]}
          >
            <Text style={[cs.chipText, active && cs.chipTextActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ─── section divider ────────────────────────────────────────────────────── */

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={sec.container}>
      <Text style={sec.title}>{title}</Text>
    </View>
  );
}

/* ─── form state type ────────────────────────────────────────────────────── */

type FormState = {
  bio: string;
  city: string;
  state: string;
  jobTitle: string;
  school: string;
  heightCm: string;
  pronouns: string;
  lookingFor: LookingFor | "";
  interests: string[];
  photos: string[];
};

const EMPTY_FORM: FormState = {
  bio: "",
  city: "",
  state: "",
  jobTitle: "",
  school: "",
  heightCm: "",
  pronouns: "",
  lookingFor: "",
  interests: [],
  photos: Array(PHOTO_SLOTS).fill(""),
};

/* ─── main screen ────────────────────────────────────────────────────────── */

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { token, logout, user } = useAuth();

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [original, setOriginal] = useState<FormState>(EMPTY_FORM);

  const isDirty =
    JSON.stringify(form) !== JSON.stringify(original);

  /* ── fetch profile ──────────────────────────────────────────────────────── */

  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/profiles/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("not ok");
      const p = await res.json();

      const loaded: FormState = {
        bio: p.bio ?? "",
        city: p.city ?? "",
        state: p.state ?? "",
        jobTitle: p.job_title ?? "",
        school: p.school ?? "",
        heightCm: p.height_cm != null ? String(p.height_cm) : "",
        pronouns: p.pronouns ?? "",
        lookingFor: p.looking_for ?? "",
        interests: p.interests ?? [],
        photos: (() => {
          const arr = p.photos ?? [];
          const padded = [...arr];
          while (padded.length < PHOTO_SLOTS) padded.push("");
          return padded.slice(0, PHOTO_SLOTS);
        })(),
      };
      setForm(loaded);
      setOriginal(loaded);
    } catch {
      // Fall back to whatever the auth context has cached
      const fallback: FormState = {
        bio: user?.bio ?? "",
        city: user?.city ?? "",
        state: user?.state ?? "",
        jobTitle: user?.job_title ?? "",
        school: user?.school ?? "",
        heightCm: user?.height_cm != null ? String(user.height_cm) : "",
        pronouns: user?.pronouns ?? "",
        lookingFor: (user?.looking_for as LookingFor | undefined) ?? "",
        interests: user?.interests ?? [],
        photos: (() => {
          const arr = user?.photos ?? [];
          const padded = [...arr];
          while (padded.length < PHOTO_SLOTS) padded.push("");
          return padded.slice(0, PHOTO_SLOTS);
        })(),
      };
      setForm(fallback);
      setOriginal(fallback);
    } finally {
      setLoadingProfile(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /* ── save profile ───────────────────────────────────────────────────────── */

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/profiles/me`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          bio: form.bio.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          job_title: form.jobTitle.trim() || null,
          school: form.school.trim() || null,
          height_cm: form.heightCm.trim() ? Number(form.heightCm) : null,
          pronouns: form.pronouns.trim() || null,
          looking_for: form.lookingFor || null,
          interests: form.interests,
          photos: form.photos.filter(Boolean),
        }),
      });
      if (!res.ok) {
        let body: any = {};
        try { body = await res.json(); } catch {}
        throw new Error(body.detail || "Failed to save profile");
      }
      setOriginal(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  /* ── photo helpers ──────────────────────────────────────────────────────── */

  const pickPhoto = async (i: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow Neruo to access your photos in Settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      const next = [...form.photos];
      next[i] = result.assets[0].uri;
      setForm((f) => ({ ...f, photos: next }));
    }
  };

  const removePhoto = (i: number) => {
    const next = [...form.photos];
    next[i] = "";
    setForm((f) => ({ ...f, photos: next }));
  };

  /* ── interest toggle ────────────────────────────────────────────────────── */

  const toggleInterest = (interest: string) => {
    setForm((f) => {
      if (f.interests.includes(interest)) {
        return { ...f, interests: f.interests.filter((x) => x !== interest) };
      }
      if (f.interests.length >= MAX_INTERESTS) return f;
      return { ...f, interests: [...f.interests, interest] };
    });
  };

  /* ── render ─────────────────────────────────────────────────────────────── */

  const displayName = (() => {
    if (!user) return "Your Profile";
    const first = user.first_name ?? "";
    const last = user.last_name ?? "";
    return [first, last].filter(Boolean).join(" ") || "Your Profile";
  })();

  if (loadingProfile) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <ScreenHeader title="Profile" />
        <View style={s.loadingCenter}>
          <ActivityIndicator size="large" color={Purple.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title="Profile" subtitle={displayName} />

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── feedback banners ─────────────────────────────────────────── */}
        {saved && (
          <View style={s.successBanner}>
            <Text style={s.successText}>✓ Profile saved!</Text>
          </View>
        )}
        {saveError ? (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>{saveError}</Text>
          </View>
        ) : null}

        {/* ── photos ──────────────────────────────────────────────────── */}
        <SectionTitle title="Photos" />
        <Text style={s.helper}>Tap a slot to add or change a photo</Text>
        <View style={s.photoGrid}>
          {form.photos.map((uri, idx) => (
            <PhotoSlot
              key={idx}
              uri={uri}
              index={idx}
              onPick={pickPhoto}
              onRemove={removePhoto}
            />
          ))}
        </View>

        {/* ── about you ───────────────────────────────────────────────── */}
        <SectionTitle title="About You" />

        <Input
          label="Bio"
          value={form.bio}
          placeholder="Say something about yourself…"
          multiline
          numberOfLines={4}
          style={s.textarea}
          helper={`${form.bio.length} / 300`}
          onChangeText={(v) => setForm((f) => ({ ...f, bio: v.slice(0, 300) }))}
        />

        <View style={s.row}>
          <Input
            label="City"
            value={form.city}
            placeholder="Los Angeles"
            onChangeText={(v) => setForm((f) => ({ ...f, city: v }))}
            containerStyle={s.col}
          />
          <Input
            label="State"
            value={form.state}
            placeholder="CA"
            autoCapitalize="characters"
            maxLength={2}
            onChangeText={(v) => setForm((f) => ({ ...f, state: v }))}
            containerStyle={{ width: 72 }}
          />
        </View>

        <View style={s.row}>
          <Input
            label="Job title"
            value={form.jobTitle}
            placeholder="Software Engineer"
            onChangeText={(v) => setForm((f) => ({ ...f, jobTitle: v }))}
            containerStyle={s.col}
          />
          <Input
            label="School"
            value={form.school}
            placeholder="UCLA"
            onChangeText={(v) => setForm((f) => ({ ...f, school: v }))}
            containerStyle={s.col}
          />
        </View>

        <Input
          label="Height (cm)"
          value={form.heightCm}
          placeholder="175"
          keyboardType="number-pad"
          style={{ width: 100 }}
          onChangeText={(v) => setForm((f) => ({ ...f, heightCm: v }))}
        />

        {/* ── identity ────────────────────────────────────────────────── */}
        <SectionTitle title="Identity" />

        <Input
          label="Pronouns"
          value={form.pronouns}
          placeholder="he/him · she/her · they/them…"
          onChangeText={(v) => setForm((f) => ({ ...f, pronouns: v }))}
        />

        {/* ── looking for ─────────────────────────────────────────────── */}
        <SectionTitle title="Looking For" />
        <View style={s.fieldBlock}>
          <ChipSelect<LookingFor>
            value={form.lookingFor}
            options={LOOKING_FOR}
            onChange={(v) => setForm((f) => ({ ...f, lookingFor: v }))}
          />
        </View>

        {/* ── interests ───────────────────────────────────────────────── */}
        <SectionTitle title="Interests" />
        <View style={s.interestHeader}>
          <Text style={s.helper}>Pick up to {MAX_INTERESTS}</Text>
          <Text
            style={[
              s.interestCount,
              form.interests.length === MAX_INTERESTS && s.interestCountMax,
            ]}
          >
            {form.interests.length}/{MAX_INTERESTS}
          </Text>
        </View>
        <View style={s.interestGrid}>
          {INTEREST_OPTIONS.map((interest) => {
            const active = form.interests.includes(interest);
            const disabled = !active && form.interests.length >= MAX_INTERESTS;
            return (
              <Pressable
                key={interest}
                onPress={() => toggleInterest(interest)}
                disabled={disabled}
                style={[
                  s.interestChip,
                  active && s.interestChipActive,
                  disabled && s.interestChipDisabled,
                ]}
              >
                <Text
                  style={[
                    s.interestChipText,
                    active && s.interestChipTextActive,
                  ]}
                >
                  {interest}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── save button ──────────────────────────────────────────────── */}
        {isDirty && (
          <Button
            label="Save Changes"
            loading={saving}
            loadingLabel="Saving…"
            onPress={handleSave}
            style={s.saveBtn}
          />
        )}

        {/* ── account ─────────────────────────────────────────────────── */}
        <SectionTitle title="Account" />
        <Button
          label="Log Out"
          variant="danger"
          onPress={async () => {
            await logout();
          }}
        />
      </ScrollView>
    </View>
  );
}

/* ─── styles ─────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 0 },

  successBanner: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  successText: { color: "#166534", fontSize: 14, fontWeight: "600" },
  errorBanner: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: "#b91c1c", fontSize: 14 },

  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },

  row: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },

  textarea: { minHeight: 100, textAlignVertical: "top" },
  helper: { fontSize: 12, color: "#999", marginBottom: 10 },

  fieldBlock: { marginBottom: 14 },

  interestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  interestCount: { fontSize: 13, color: "#999" },
  interestCountMax: { color: Purple.primary, fontWeight: "600" },
  interestGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  interestChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  interestChipActive: { backgroundColor: Purple.primary, borderColor: Purple.primary },
  interestChipDisabled: { opacity: 0.35 },
  interestChipText: { fontSize: 13, color: "#333" },
  interestChipTextActive: { color: "#fff" },

  saveBtn: { marginBottom: 8 },
});

const ps = StyleSheet.create({
  slot: { width: SLOT_SIZE, height: SLOT_SIZE, borderRadius: 12, overflow: "hidden" },
  empty: {
    borderWidth: 1.5,
    borderColor: Purple.border,
    borderStyle: "dashed",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  plus: { fontSize: 28, color: Purple.light, lineHeight: 32 },
  label: { fontSize: 9, fontWeight: "700", color: Purple.light, letterSpacing: 1, marginTop: 2 },
  image: { width: "100%", height: "100%" },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 10, color: "#fff", fontWeight: "700" },
});

const cs = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  chipActive: { backgroundColor: Purple.primary, borderColor: Purple.primary },
  chipText: { fontSize: 13, color: "#333" },
  chipTextActive: { color: "#fff" },
});

const sec = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e5e5",
    paddingTop: 20,
    marginBottom: 14,
    marginTop: 8,
  },
  title: { fontSize: 15, fontWeight: "700", color: "#111" },
});
