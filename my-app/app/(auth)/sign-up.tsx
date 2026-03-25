/**
 * app/(auth)/sign-up.tsx — Sign-Up / Profile Creation Screen
 *
 * Responsibilities:
 *   - 5-step onboarding form: account → basics → about → interests → photos
 *   - Step 0 creates the backend account (POST /auth/register)
 *   - Final step saves the profile (POST /profiles/me)
 *   - On completion, navigates to /onboarding (the AI chat gate)
 */

import React, { useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Formik, type FormikProps } from "formik";
import * as Yup from "yup";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Purple } from "@/constants/theme";
import { useAuth } from "@/context/AuthProvider";
import {
  GENDERS,
  INTEREST_OPTIONS,
  LOOKING_FOR,
  MAX_INTERESTS,
  ORIENTATIONS,
  PHOTO_SLOTS,
  STEP_TITLES,
  TOTAL_STEPS,
} from "@/constants/profile";
import type { Gender, LookingFor, Orientation, ProfileFormValues, ProfilePayload } from "@/types/profile";

/* ─── per-step schemas ───────────────────────────────────────────────────── */

const accountSchema = Yup.object({
  email: Yup.string().email("Invalid email").required("Email is required"),
  password: Yup.string().min(6, "At least 6 characters").max(72, "72 characters max").required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords don't match")
    .required("Please confirm your password"),
});

const basicsSchema = Yup.object({
  firstName: Yup.string().trim().min(2, "Too short").max(30, "Too long").required("Required"),
  lastName: Yup.string().trim().max(30, "Too long").optional(),
  age: Yup.number()
    .transform((_, orig) => {
      const s = String(orig ?? "").trim();
      return s === "" ? NaN : Number(s);
    })
    .typeError("Must be a number")
    .integer("Must be a whole number")
    .min(18, "Must be 18+")
    .max(99, "Too high")
    .required("Required") as unknown as Yup.NumberSchema<number>,
  gender: Yup.mixed<Gender | "">()
    .oneOf([...GENDERS, ""] as const)
    .test("required", "Required", (v) => Boolean(v && String(v).trim()))
    .required("Required"),
  genderOther: Yup.string().when("gender", {
    is: "Other",
    then: (s) => s.trim().min(2, "Please specify").required("Required"),
    otherwise: (s) => s.trim().optional(),
  }),
  orientation: Yup.mixed<Orientation | "">()
    .oneOf([...ORIENTATIONS, ""] as const)
    .test("required", "Required", (v) => Boolean(v && String(v).trim()))
    .required("Required"),
  orientationOther: Yup.string().when("orientation", {
    is: "Other",
    then: (s) => s.trim().min(2, "Please specify").required("Required"),
    otherwise: (s) => s.trim().optional(),
  }),
  pronouns: Yup.string().trim().max(30, "Too long").optional(),
});

const aboutSchema = Yup.object({
  bio: Yup.string().trim().max(300, "Max 300 chars").optional(),
  city: Yup.string().trim().max(40, "Too long").optional(),
  state: Yup.string().trim().max(40, "Too long").optional(),
  jobTitle: Yup.string().trim().max(60, "Too long").optional(),
  school: Yup.string().trim().max(60, "Too long").optional(),
  heightCm: Yup.number()
    .transform((_, orig) => {
      const s = String(orig ?? "").trim();
      return s === "" ? undefined : Number(s);
    })
    .typeError("Must be a number")
    .integer("Must be a whole number")
    .min(120, "Min 120 cm")
    .max(230, "Max 230 cm")
    .optional() as unknown as Yup.StringSchema<string>,
  lookingFor: Yup.mixed<LookingFor | "">()
    .oneOf([...LOOKING_FOR, ""] as const)
    .optional(),
});

const interestsSchema = Yup.object({
  interests: Yup.array()
    .of(Yup.string().required())
    .min(1, "Pick at least 1 interest")
    .required(),
});

const photosSchema = Yup.object({
  photos: Yup.array()
    .of(
      Yup.string()
        .trim()
        .test("uri-or-empty", "Must be a valid URI", (v) => {
          const s = (v ?? "").trim();
          return (
            !s ||
            /^https?:\/\/.+/i.test(s) ||
            /^file:\/\/.+/i.test(s) ||
            /^ph:\/\/.+/i.test(s) ||
            /^content:\/\/.+/i.test(s)
          );
        }),
    )
    .test("main-photo", "At least 1 photo is required", (arr) => Boolean(arr?.[0]?.trim()))
    .required(),
});

const STEP_SCHEMAS = [accountSchema, basicsSchema, aboutSchema, interestsSchema, photosSchema];

const STEP_FIELDS: (keyof ProfileFormValues)[][] = [
  ["email", "password", "confirmPassword"],
  ["firstName", "lastName", "age", "gender", "genderOther", "orientation", "orientationOther", "pronouns"],
  ["bio", "city", "state", "jobTitle", "school", "heightCm", "lookingFor"],
  ["interests"],
  ["photos"],
];

/* ─── helpers ────────────────────────────────────────────────────────────── */

/**
 * Converts a Yup ValidationError into the `errors` and `touched` maps that
 * Formik's setErrors/setTouched expect. Also marks every field in the current
 * step as touched so inline error messages appear immediately.
 */
function collectValidationErrors(
  err: Yup.ValidationError,
  step: number,
): { errors: Record<string, string>; touched: Record<string, boolean> } {
  const errors: Record<string, string> = {};
  const touched: Record<string, boolean> = {};
  err.inner.forEach((e) => {
    if (e.path) {
      errors[e.path] = e.message;
      touched[e.path] = true;
    }
  });
  STEP_FIELDS[step].forEach((f) => { touched[f] = true; });
  return { errors, touched };
}

const buildPayload = (v: ProfileFormValues): ProfilePayload => ({
  firstName: v.firstName.trim(),
  lastName: v.lastName.trim() || undefined,
  age: Number(v.age),
  gender: v.gender === "Other" ? v.genderOther.trim() : String(v.gender),
  orientation: v.orientation === "Other" ? v.orientationOther.trim() : String(v.orientation),
  pronouns: v.pronouns.trim() || undefined,
  bio: v.bio.trim() || undefined,
  city: v.city.trim() || undefined,
  state: v.state.trim() || undefined,
  jobTitle: v.jobTitle.trim() || undefined,
  school: v.school.trim() || undefined,
  heightCm: v.heightCm.trim() ? Number(v.heightCm) : null,
  lookingFor: v.lookingFor || undefined,
  interests: v.interests,
  photos: v.photos.map((p) => p.trim()).filter(Boolean),
});

const initialValues: ProfileFormValues = {
  email: "", password: "", confirmPassword: "",
  firstName: "", lastName: "", age: "",
  gender: "", genderOther: "",
  orientation: "", orientationOther: "",
  pronouns: "", bio: "",
  city: "", state: "",
  jobTitle: "", school: "",
  heightCm: "", lookingFor: "",
  interests: [],
  photos: Array(PHOTO_SLOTS).fill(""),
};

/* ─── small UI components ────────────────────────────────────────────────── */

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={s.progressRow}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View key={i} style={[s.progressSegment, i <= step && s.progressSegmentActive]} />
      ))}
    </View>
  );
}

function ChipRow<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | "";
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={s.chipRow}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[s.chip, active && s.chipActive]}
          >
            <Text style={[s.chipText, active && s.chipTextActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ─── step screens ───────────────────────────────────────────────────────── */

function StepAccount({ bag }: { bag: FormikProps<ProfileFormValues> }) {
  const { values, errors, touched, handleChange, handleBlur } = bag;
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  return (
    <>
      <Text style={s.stepIntro}>Enter your email and create a password to get started.</Text>
      <Input
        label="Email"
        required
        error={errors.email}
        touched={touched.email}
        value={values.email}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        onChangeText={handleChange("email")}
        onBlur={handleBlur("email")}
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <Input
        ref={passwordRef}
        label="Password"
        required
        error={errors.password}
        touched={touched.password}
        value={values.password}
        placeholder="••••••••"
        secureTextEntry
        textContentType="newPassword"
        returnKeyType="next"
        onChangeText={handleChange("password")}
        onBlur={handleBlur("password")}
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <Input
        ref={confirmRef}
        label="Confirm password"
        required
        error={errors.confirmPassword}
        touched={touched.confirmPassword}
        value={values.confirmPassword}
        placeholder="••••••••"
        secureTextEntry
        textContentType="newPassword"
        returnKeyType="done"
        onChangeText={handleChange("confirmPassword")}
        onBlur={handleBlur("confirmPassword")}
      />
    </>
  );
}

function StepBasics({ bag }: { bag: FormikProps<ProfileFormValues> }) {
  const { values, errors, touched, handleChange, handleBlur, setFieldValue } = bag;
  return (
    <>
      <View style={s.row}>
        <Input
          label="First name"
          required
          error={errors.firstName}
          touched={touched.firstName}
          value={values.firstName}
          placeholder="Smbat"
          autoCorrect={false}
          onChangeText={handleChange("firstName")}
          onBlur={handleBlur("firstName")}
          containerStyle={s.col}
        />
        <Input
          label="Last name"
          error={errors.lastName}
          touched={touched.lastName}
          value={values.lastName}
          placeholder="M."
          autoCorrect={false}
          onChangeText={handleChange("lastName")}
          onBlur={handleBlur("lastName")}
          containerStyle={s.col}
        />
      </View>

      <Input
        label="Age"
        required
        error={errors.age as string}
        touched={touched.age}
        value={values.age}
        placeholder="21"
        keyboardType="number-pad"
        style={s.inputNarrow}
        onChangeText={handleChange("age")}
        onBlur={handleBlur("age")}
      />

      <Text style={s.sectionTitle}>Identity</Text>

      <View style={s.fieldBlock}>
        <Text style={s.fieldLabel}>
          Gender <Text style={s.required}>*</Text>
        </Text>
        <ChipRow value={values.gender} options={GENDERS} onChange={(v) => setFieldValue("gender", v)} />
        {touched.gender && errors.gender ? <Text style={s.fieldError}>{errors.gender as string}</Text> : null}
      </View>

      {values.gender === "Other" && (
        <Input
          label="Specify gender"
          required
          error={errors.genderOther}
          touched={touched.genderOther}
          value={values.genderOther}
          placeholder="Type here…"
          onChangeText={handleChange("genderOther")}
          onBlur={handleBlur("genderOther")}
        />
      )}

      <View style={s.fieldBlock}>
        <Text style={s.fieldLabel}>
          Orientation <Text style={s.required}>*</Text>
        </Text>
        <ChipRow value={values.orientation} options={ORIENTATIONS} onChange={(v) => setFieldValue("orientation", v)} />
        {touched.orientation && errors.orientation ? <Text style={s.fieldError}>{errors.orientation as string}</Text> : null}
      </View>

      {values.orientation === "Other" && (
        <Input
          label="Specify orientation"
          required
          error={errors.orientationOther}
          touched={touched.orientationOther}
          value={values.orientationOther}
          placeholder="Type here…"
          onChangeText={handleChange("orientationOther")}
          onBlur={handleBlur("orientationOther")}
        />
      )}

      <Input
        label="Pronouns"
        error={errors.pronouns}
        touched={touched.pronouns}
        value={values.pronouns}
        placeholder="he/him · she/her · they/them…"
        onChangeText={handleChange("pronouns")}
        onBlur={handleBlur("pronouns")}
      />
    </>
  );
}

function StepAbout({ bag }: { bag: FormikProps<ProfileFormValues> }) {
  const { values, errors, touched, handleChange, handleBlur, setFieldValue } = bag;
  return (
    <>
      <Input
        label="Bio"
        error={errors.bio}
        touched={touched.bio}
        helper={`${values.bio.length} / 300`}
        value={values.bio}
        placeholder="Say something about yourself…"
        multiline
        numberOfLines={4}
        style={s.textarea}
        onChangeText={handleChange("bio")}
        onBlur={handleBlur("bio")}
      />

      <View style={s.row}>
        <Input
          label="City"
          error={errors.city}
          touched={touched.city}
          value={values.city}
          placeholder="Los Angeles"
          onChangeText={handleChange("city")}
          onBlur={handleBlur("city")}
          containerStyle={s.col}
        />
        <Input
          label="State"
          error={errors.state}
          touched={touched.state}
          value={values.state}
          placeholder="CA"
          autoCapitalize="characters"
          maxLength={2}
          onChangeText={handleChange("state")}
          onBlur={handleBlur("state")}
          containerStyle={{ width: 72 }}
        />
      </View>

      <View style={s.row}>
        <Input
          label="Job title"
          error={errors.jobTitle}
          touched={touched.jobTitle}
          value={values.jobTitle}
          placeholder="Software Engineer"
          onChangeText={handleChange("jobTitle")}
          onBlur={handleBlur("jobTitle")}
          containerStyle={s.col}
        />
        <Input
          label="School"
          error={errors.school}
          touched={touched.school}
          value={values.school}
          placeholder="CSUN"
          onChangeText={handleChange("school")}
          onBlur={handleBlur("school")}
          containerStyle={s.col}
        />
      </View>

      <Input
        label="Height (cm)"
        error={errors.heightCm as string}
        touched={touched.heightCm}
        value={values.heightCm}
        placeholder="180"
        keyboardType="number-pad"
        style={s.inputNarrow}
        onChangeText={handleChange("heightCm")}
        onBlur={handleBlur("heightCm")}
      />

      <View style={s.fieldBlock}>
        <Text style={s.fieldLabel}>Looking for</Text>
        <ChipRow
          value={values.lookingFor}
          options={LOOKING_FOR}
          onChange={(v) => setFieldValue("lookingFor", v)}
        />
      </View>
    </>
  );
}

function StepInterests({ bag }: { bag: FormikProps<ProfileFormValues> }) {
  const { values, errors, touched, setFieldValue } = bag;
  const selected: string[] = values.interests;

  const toggle = (interest: string) => {
    if (selected.includes(interest)) {
      setFieldValue("interests", selected.filter((i) => i !== interest));
    } else if (selected.length < MAX_INTERESTS) {
      setFieldValue("interests", [...selected, interest]);
    }
  };

  return (
    <>
      <View style={s.interestHeader}>
        <Text style={s.helperText}>Tap to select · pick up to {MAX_INTERESTS}</Text>
        <Text style={[s.interestCount, selected.length === MAX_INTERESTS && s.interestCountMax]}>
          {selected.length}/{MAX_INTERESTS}
        </Text>
      </View>

      {touched.interests && errors.interests ? (
        <Text style={[s.fieldError, { marginBottom: 10 }]}>{errors.interests as string}</Text>
      ) : null}

      <View style={s.interestGrid}>
        {INTEREST_OPTIONS.map((interest) => {
          const active = selected.includes(interest);
          const disabled = !active && selected.length >= MAX_INTERESTS;
          return (
            <Pressable
              key={interest}
              onPress={() => toggle(interest)}
              disabled={disabled}
              style={[s.interestChip, active && s.interestChipActive, disabled && s.interestChipDisabled]}
            >
              <Text style={[s.interestChipText, active && s.interestChipTextActive]}>
                {interest}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

/* ─── photo grid ─────────────────────────────────────────────────────────── */

const windowWidth = Dimensions.get("window").width;
const SLOT_SIZE = (windowWidth - 40 - 16) / 3;

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
        style={s.photoSlot}
        onPress={() =>
          Alert.alert("Photo", undefined, [
            { text: "Change", onPress: () => onPick(index) },
            { text: "Remove", style: "destructive", onPress: () => onRemove(index) },
            { text: "Cancel", style: "cancel" },
          ])
        }
      >
        <Image source={{ uri }} style={s.photoSlotImage} contentFit="cover" />
        <View style={s.photoSlotBadge}>
          <Text style={s.photoSlotBadgeText}>✕</Text>
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable
      style={[
        s.photoSlot,
        s.photoSlotEmpty,
        Platform.OS === "android" && { borderStyle: "solid" },
      ]}
      onPress={() => onPick(index)}
    >
      <Text style={s.photoSlotPlus}>+</Text>
      {index === 0 && <Text style={s.photoSlotLabel}>MAIN</Text>}
    </Pressable>
  );
}

function StepPhotos({ bag }: { bag: FormikProps<ProfileFormValues> }) {
  const { values, errors, touched, setFieldValue } = bag;

  const pickImage = async (i: number) => {
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
      const next = [...values.photos];
      next[i] = result.assets[0].uri;
      setFieldValue("photos", next);
    }
  };

  const removePhoto = (i: number) => {
    const next = [...values.photos];
    next[i] = "";
    setFieldValue("photos", next);
  };

  return (
    <>
      <Text style={s.helperText}>Tap a slot to add a photo · first slot is your main photo</Text>

      {typeof errors.photos === "string" && touched.photos && (
        <Text style={[s.fieldError, { marginTop: 6, marginBottom: 4 }]}>{errors.photos}</Text>
      )}

      <View style={s.photoGrid}>
        {values.photos.map((uri: string, idx: number) => (
          <PhotoSlot
            key={idx}
            uri={uri}
            index={idx}
            onPick={pickImage}
            onRemove={removePhoto}
          />
        ))}
      </View>
    </>
  );
}

/* ─── main component ─────────────────────────────────────────────────────── */

export default function ProfileCreate(): React.JSX.Element {
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();
  const { token, register } = useAuth();

  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: false });

  const goNext = async (
    values: ProfileFormValues,
    setTouched: (t: Record<string, boolean>, shouldValidate?: boolean) => void,
    setErrors: (e: Record<string, string>) => void,
  ) => {
    try {
      await STEP_SCHEMAS[step].validate(values, { abortEarly: false });
    } catch (err) {
      if (err instanceof Yup.ValidationError) {
        const { errors, touched } = collectValidationErrors(err, step);
        setErrors(errors);
        setTouched(touched, false);
      }
      return;
    }

    // Step 0: register account before proceeding
    if (step === 0) {
      setRegistering(true);
      setSubmitError(null);
      try {
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: values.email, password: values.password }),
        });
        let data: Record<string, unknown> = {};
        try {
          data = await res.json();
        } catch {}
        if (!res.ok) throw new Error((data.detail as string) || "Registration failed");
        await register(data.token, data.user);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Something went wrong. Try again.");
        setRegistering(false);
        return;
      }
      setRegistering(false);
    }

    setStep((s) => s + 1);
    scrollToTop();
  };

  const goBack = () => {
    setStep((s) => s - 1);
    scrollToTop();
  };

  const handleSubmit = async (
    values: ProfileFormValues,
    setTouched: (t: Record<string, boolean>, shouldValidate?: boolean) => void,
    setErrors: (e: Record<string, string>) => void,
    submitForm: () => void,
  ) => {
    try {
      await STEP_SCHEMAS[step].validate(values, { abortEarly: false });
      submitForm();
    } catch (err) {
      if (err instanceof Yup.ValidationError) {
        const { errors, touched } = collectValidationErrors(err, step);
        setErrors(errors);
        setTouched(touched, false);
      }
    }
  };

  return (
    <SafeAreaView style={s.flex}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Formik<ProfileFormValues>
          initialValues={initialValues}
          onSubmit={async (values, { setSubmitting }) => {
            setSubmitError(null);
            const payload = buildPayload(values);
            try {
              const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/profiles/me`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                  first_name: payload.firstName,
                  last_name: payload.lastName ?? null,
                  age: payload.age,
                  gender: payload.gender,
                  orientation: payload.orientation,
                  pronouns: payload.pronouns ?? null,
                  bio: payload.bio ?? null,
                  city: payload.city ?? null,
                  state: payload.state ?? null,
                  job_title: payload.jobTitle ?? null,
                  school: payload.school ?? null,
                  height_cm: payload.heightCm ?? null,
                  looking_for: payload.lookingFor ?? null,
                  interests: payload.interests,
                  photos: payload.photos,
                }),
              });
              if (!res.ok) {
                let errBody: Record<string, unknown> = {};
                try {
                  errBody = await res.json();
                } catch {}
                throw new Error((errBody.detail as string) || "Failed to save profile");
              }
            } catch (err) {
              setSubmitError(err instanceof Error ? err.message : "Something went wrong. Try again.");
              setSubmitting(false);
              return;
            }
            setSubmitting(false);
            router.replace("/onboarding");
          }}
        >
          {(bag) => {
            const { values, isSubmitting, setTouched, setErrors, submitForm } = bag;
            const isLastStep = step === TOTAL_STEPS - 1;
            const isBusy = isSubmitting || registering;

            return (
              <ScrollView
                ref={scrollRef}
                contentContainerStyle={s.container}
                keyboardShouldPersistTaps="handled"
              >
                <ProgressBar step={step} />
                {submitError ? (
                  <View style={s.errorBanner}>
                    <Text style={s.errorBannerText}>{submitError}</Text>
                  </View>
                ) : null}
                <Text style={s.title}>{STEP_TITLES[step]}</Text>
                <Text style={s.stepCounter}>Step {step + 1} of {TOTAL_STEPS}</Text>

                {step === 0 && <StepAccount bag={bag} />}
                {step === 1 && <StepBasics bag={bag} />}
                {step === 2 && <StepAbout bag={bag} />}
                {step === 3 && <StepInterests bag={bag} />}
                {step === 4 && <StepPhotos bag={bag} />}

                <View style={s.navRow}>
                  {step > 0 ? (
                    <Button
                      label="← Back"
                      variant="secondary"
                      onPress={goBack}
                      style={s.backButton}
                    />
                  ) : (
                    <Button
                      label="← Login"
                      variant="secondary"
                      onPress={() => router.back()}
                      style={s.backButton}
                    />
                  )}
                  <Button
                    label={isLastStep ? "Create Profile" : "Next →"}
                    loadingLabel={step === 0 ? "Creating account…" : "Saving…"}
                    loading={isBusy}
                    onPress={() =>
                      isLastStep
                        ? handleSubmit(values, setTouched, setErrors, submitForm)
                        : goNext(values, setTouched, setErrors)
                    }
                    style={s.nextButton}
                  />
                </View>
              </ScrollView>
            );
          }}
        </Formik>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─── styles ─────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 52, backgroundColor: "#fff" },

  // Error banner
  errorBanner: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorBannerText: { color: "#b91c1c", fontSize: 14 },

  // Progress bar
  progressRow: { flexDirection: "row", gap: 6, marginBottom: 24 },
  progressSegment: { flex: 1, height: 4, borderRadius: 99, backgroundColor: "#e5e5e5" },
  progressSegmentActive: { backgroundColor: Purple.primary },

  // Header
  title: { fontSize: 26, fontWeight: "700", color: "#111", marginBottom: 2 },
  stepCounter: { fontSize: 13, color: "#999", marginBottom: 22 },
  stepIntro: { fontSize: 14, color: "#666", marginBottom: 20, lineHeight: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111", marginTop: 8, marginBottom: 8 },

  // Layout
  row: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },

  // Field blocks (for chip selectors)
  fieldBlock: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#333", marginBottom: 7 },
  required: { color: "#ef4444" },
  helperText: { fontSize: 12, color: "#999", marginBottom: 4 },
  fieldError: { fontSize: 12, color: "#ef4444", marginTop: 5 },

  // Input overrides
  inputNarrow: { width: 100 },
  textarea: { minHeight: 110, textAlignVertical: "top" },

  // Chips (gender / orientation / lookingFor)
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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

  // Interest chips
  interestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  interestCount: { fontSize: 13, color: "#999" },
  interestCountMax: { color: Purple.primary, fontWeight: "600" },
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

  // Photo grid
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  photoSlot: { width: SLOT_SIZE, height: SLOT_SIZE, borderRadius: 12, overflow: "hidden" },
  photoSlotEmpty: {
    borderWidth: 1.5,
    borderColor: Purple.border,
    borderStyle: "dashed",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  photoSlotPlus: { fontSize: 28, color: Purple.light, lineHeight: 32 },
  photoSlotLabel: { fontSize: 9, fontWeight: "700", color: Purple.light, letterSpacing: 1, marginTop: 2 },
  photoSlotImage: { width: "100%", height: "100%" },
  photoSlotBadge: {
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
  photoSlotBadgeText: { fontSize: 10, color: "#fff", fontWeight: "700" },

  // Nav buttons
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 28,
    gap: 12,
  },
  backButton: { paddingHorizontal: 20 },
  nextButton: { flex: 1 },
});
