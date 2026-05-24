import React from "react";
import { View } from "react-native";
import { theme } from "../../theme/theme";

export function ProgressBar({
  value,
  max = 100,
  color,
}: {
  value: number;
  max?: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <View style={{ height: 6, borderRadius: 10, overflow: "hidden", backgroundColor: theme.border }}>
      <View style={{ height: "100%", width: `${pct * 100}%`, backgroundColor: color, borderRadius: 10 }} />
    </View>
  );
}
