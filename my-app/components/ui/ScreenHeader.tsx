/**
 * components/ui/ScreenHeader.tsx — In-screen Page Header
 *
 * Used on tabs and modals that manage their own header instead of the
 * Stack navigator. Renders a title + optional subtitle with a bottom border.
 */

import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({ title, subtitle, style }: ScreenHeaderProps) {
  return (
    <View style={[s.container, style]}>
      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5e5",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#111" },
  subtitle: { fontSize: 14, color: "#888", marginTop: 2 },
});
