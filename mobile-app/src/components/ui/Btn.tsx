import React from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../theme/theme";

export function Btn({
  children,
  onPress,
  variant = "primary",
  icon,
  disabled,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: "primary" | "outline" | "ghost" | "danger" | "secondary";
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  const normalizedVariant = variant === "secondary" ? "ghost" : variant;
  const textColor =
    normalizedVariant === "primary"
      ? "#000"
      : normalizedVariant === "outline"
        ? theme.accent
        : normalizedVariant === "danger"
          ? theme.danger
          : theme.text;
  const borderColor = normalizedVariant === "outline" ? theme.accent : "transparent";
  const bg =
    normalizedVariant === "ghost"
      ? theme.surfaceAlt
      : normalizedVariant === "danger"
        ? `${theme.danger}22`
        : "transparent";

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => ({
        opacity: disabled ? 0.6 : pressed ? 0.9 : 1,
        borderWidth: normalizedVariant === "outline" ? 1.5 : 0,
        borderColor,
        borderRadius: 14,
        overflow: "hidden",
      })}
    >
      {normalizedVariant === "primary" ? (
        <LinearGradient
          colors={[theme.primary, theme.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {icon ? <View style={{ marginRight: 6 }}>{icon}</View> : null}
          <Text
            style={{
              color: textColor,
              fontFamily: theme.font.black,
              fontSize: 14,
              letterSpacing: 0.2,
            }}
          >
            {children}
          </Text>
        </LinearGradient>
      ) : (
        <View
          style={{
            backgroundColor: bg,
            paddingVertical: 14,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {icon ? <View style={{ marginRight: 6 }}>{icon}</View> : null}
          <Text
            style={{
              color: textColor,
              fontFamily: theme.font.bold,
              fontSize: 14,
              letterSpacing: 0.2,
            }}
          >
            {children}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
