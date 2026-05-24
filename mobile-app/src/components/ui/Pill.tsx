import React from "react";
import { Text, View } from "react-native";

export function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: `${color}22`,
        borderWidth: 1,
        borderColor: `${color}44`,
      }}
    >
      <Text style={{ color, fontSize: 11, fontWeight: "800" }}>{children}</Text>
    </View>
  );
}

