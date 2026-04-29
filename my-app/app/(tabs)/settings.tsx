/**
 * app/(tabs)/settings.tsx — Profile / Settings Screen
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
import { Purple } from "@/constants/theme";
import { useAuth } from "@/context/AuthProvider";
import { apiFetch } from "@/utils/api";
import { uploadPhotos } from "@/utils/uploadPhoto";
import {
  INTEREST_OPTIONS,
  LOOKING_FOR,
  MAX_INTERESTS,
  PHOTO_SLOTS,
} from "@/constants/profile";
import type { LookingFor } from "@/types/profile";

const { width: W } = Dimensions.get("window");
// W - 32 (screen padding 16×2) - 32 (card body padding 16×2) - 16 (2 gaps of 8)
const SLOT_SIZE = Math.floor((W - 80) / 3);

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

/* ─── chip selector ──────────────────────────────────────────────────────── */

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

/* ─── section card ───────────────────────────────────────────────────────── */

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={sc.card}>
      <View style={sc.header}>
        <View style={sc.iconBadge}>
          <Text style={sc.iconText}>{icon}</Text>
        </View>
        <Text style={sc.title}>{title}</Text>
      </View>
      <View style={sc.body}>{children}</View>
    </View>
  );
}

/* ─── row item (for account actions) ─────────────────────────────────────── */

function RowItem({
  icon,
  label,
  sublabel,
  onPress,
  destructive,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [ri.row, pressed && ri.pressed]}
    >
      <View style={ri.left}>
        <Text style={ri.icon}>{icon}</Text>
        <View>
          <Text style={[ri.label, destructive && ri.destructiveText]}>{label}</Text>
          {sublabel ? <Text style={ri.sublabel}>{sublabel}</Text> : null}
        </View>
      </View>
      <Text style={[ri.chevron, destructive && ri.destructiveText]}>›</Text>
    </Pressable>
  );
}

/* ─── form state ─────────────────────────────────────────────────────────── */

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

  const isDirty = JSON.stringify(form) !== JSON.stringify(original);

  /* ── fetch profile ──────────────────────────────────────────────────────── */

  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const res = await apiFetch("/profiles/me");
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
      const uploadedPhotos = await uploadPhotos(form.photos);

      const res = await apiFetch("/profiles/me", {
        method: "POST",
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
          photos: uploadedPhotos.filter(Boolean),
        }),
      });
      if (!res.ok) {
        let body: any = {};
        try { body = await res.json(); } catch {}
        throw new Error(body.detail || "Failed to save profile");
      }
      const savedForm = { ...form, photos: uploadedPhotos };
      setForm(savedForm);
      setOriginal(savedForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);

      const bioChanged = form.bio.trim() !== original.bio.trim();
      const interestsChanged = JSON.stringify(form.interests) !== JSON.stringify(original.interests);
      if ((bioChanged || interestsChanged) && token) {
        const conversation = [
          form.bio.trim() ? `User bio: ${form.bio.trim()}.` : "",
          form.interests.length ? `Interests: ${form.interests.join(", ")}.` : "",
          form.lookingFor ? `Looking for: ${form.lookingFor}.` : "",
        ].filter(Boolean).join(" ");
        apiFetch("/onboarding/summarize", {
          method: "POST",
          body: JSON.stringify({ conversation }),
        }).catch(() => {});
      }
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

  const mainPhoto = form.photos.find(Boolean) ?? null;

  if (loadingProfile) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.loadingCenter}>
          <ActivityIndicator size="large" color={Purple.primary} />
          <Text style={s.loadingText}>Loading profile…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + (isDirty ? 100 : 40) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── page title ───────────────────────────────────────────────── */}
        <Text style={s.pageTitle}>Edit Profile</Text>

        {/* ── feedback banners ─────────────────────────────────────────── */}
        {saved && (
          <View style={s.successBanner}>
            <Text style={s.successText}>✓  Profile saved!</Text>
          </View>
        )}
        {saveError ? (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>{saveError}</Text>
          </View>
        ) : null}

        {/* ── profile header card ──────────────────────────────────────── */}
        <View style={s.profileCard}>
          <View style={s.avatarWrap}>
            {mainPhoto ? (
              <Image source={{ uri: mainPhoto }} style={s.avatar} contentFit="cover" />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarInitial}>
                  {(user?.first_name?.[0] ?? "?").toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{displayName}</Text>
            <Text style={s.profileSub}>
              {form.city && form.state
                ? `${form.city}, ${form.state}`
                : form.city || form.state || "Add your location"}
            </Text>
          </View>
        </View>

        {/* ── photos ──────────────────────────────────────────────────── */}
        <SectionCard icon="📷" title="Photos">
          <Text style={s.helper}>Tap a slot to add or change · tap a photo to remove</Text>
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
        </SectionCard>

        {/* ── about you ───────────────────────────────────────────────── */}
        <SectionCard icon="✏️" title="About You">
          <Input
            label="Bio"
            value={form.bio}
            placeholder="Say something about yourself…"
            multiline
            numberOfLines={4}
            style={s.textarea}
            helper={`${form.bio.length} / 300 characters`}
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
        </SectionCard>

        {/* ── identity ────────────────────────────────────────────────── */}
        <SectionCard icon="🏳️‍🌈" title="Identity">
          <Input
            label="Pronouns"
            value={form.pronouns}
            placeholder="he/him · she/her · they/them…"
            onChangeText={(v) => setForm((f) => ({ ...f, pronouns: v }))}
          />
        </SectionCard>

        {/* ── looking for ─────────────────────────────────────────────── */}
        <SectionCard icon="💞" title="Looking For">
          <ChipSelect<LookingFor>
            value={form.lookingFor}
            options={LOOKING_FOR}
            onChange={(v) => setForm((f) => ({ ...f, lookingFor: v }))}
          />
        </SectionCard>

        {/* ── interests ───────────────────────────────────────────────── */}
        <SectionCard icon="✨" title="Interests">
          <View style={s.interestHeader}>
            <Text style={s.helper}>Pick up to {MAX_INTERESTS}</Text>
            <View style={[
              s.interestBadge,
              form.interests.length === MAX_INTERESTS && s.interestBadgeMax,
            ]}>
              <Text style={[
                s.interestBadgeText,
                form.interests.length === MAX_INTERESTS && s.interestBadgeTextMax,
              ]}>
                {form.interests.length}/{MAX_INTERESTS}
              </Text>
            </View>
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
                  <Text style={[s.interestChipText, active && s.interestChipTextActive]}>
                    {interest}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        {/* ── account ─────────────────────────────────────────────────── */}
        <SectionCard icon="⚙️" title="Account">
          <RowItem
            icon="🚪"
            label="Log Out"
            sublabel="You can always sign back in"
            onPress={async () => {
              Alert.alert("Log Out", "Are you sure you want to log out?", [
                { text: "Cancel", style: "cancel" },
                { text: "Log Out", style: "destructive", onPress: async () => { await logout(); } },
              ]);
            }}
          />
          <View style={s.divider} />
          <RowItem
            icon="🗑️"
            label="Delete Account"
            sublabel="Permanently removes all your data"
            destructive
            onPress={() => {
              Alert.alert(
                "Delete Account",
                "This will permanently delete your profile, matches, and all data. This cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        await apiFetch("/auth/delete-account", { method: "DELETE" });
                      } catch {}
                      await logout();
                    },
                  },
                ]
              );
            }}
          />
        </SectionCard>
      </ScrollView>

      {/* ── sticky save bar ─────────────────────────────────────────────── */}
      {isDirty && (
        <View style={[s.saveBar, { paddingBottom: insets.bottom + 8 }]}>
          <Button
            label="Save Changes"
            loading={saving}
            loadingLabel="Saving…"
            onPress={handleSave}
          />
        </View>
      )}
    </View>
  );
}

/* ─── styles ─────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f5f7" },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#999" },

  content: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },

  pageTitle: { fontSize: 28, fontWeight: "800", color: "#111", marginBottom: 4 },

  successBanner: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 12,
    padding: 14,
  },
  successText: { color: "#166534", fontSize: 14, fontWeight: "600" },
  errorBanner: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 14,
  },
  errorText: { color: "#b91c1c", fontSize: 14 },

  /* profile header */
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Purple.border,
  },
  avatar: { width: "100%", height: "100%" },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Purple.faint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 26, fontWeight: "700", color: Purple.primary },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: "700", color: "#111" },
  profileSub: { fontSize: 13, color: "#888", marginTop: 2 },

  /* grids */
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  row: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  textarea: { minHeight: 100, textAlignVertical: "top" },
  helper: { fontSize: 12, color: "#999", marginBottom: 10 },

  /* interests */
  interestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  interestBadge: {
    backgroundColor: "#f0f0f0",
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  interestBadgeMax: { backgroundColor: Purple.faint },
  interestBadgeText: { fontSize: 12, color: "#888", fontWeight: "600" },
  interestBadgeTextMax: { color: Purple.primary },
  interestGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#eee", marginVertical: 4 },

  /* sticky save */
  saveBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e5e5",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
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
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },
  chipActive: { backgroundColor: Purple.primary, borderColor: Purple.primary },
  chipText: { fontSize: 13, color: "#333" },
  chipTextActive: { color: "#fff" },
});

const sc = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f0f0",
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Purple.faint,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 16 },
  title: { fontSize: 15, fontWeight: "700", color: "#111" },
  body: { padding: 16, gap: 4 },
});

const ri = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  pressed: { opacity: 0.6 },
  left: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { fontSize: 20, width: 28, textAlign: "center" },
  label: { fontSize: 15, color: "#111", fontWeight: "500" },
  sublabel: { fontSize: 12, color: "#999", marginTop: 1 },
  chevron: { fontSize: 22, color: "#ccc", fontWeight: "300" },
  destructiveText: { color: "#ef4444" },
});
