import React from "react";
import { Text, TextInput, View } from "react-native";
import { theme } from "../../theme/theme";

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
  prefix,
  hint,
}: {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  secureTextEntry?: boolean;
  prefix?: string;
  hint?: string;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      {label ? (
        <Text
          style={{
            fontSize: 12,
            fontFamily: theme.font.semibold,
            color: theme.muted,
            marginBottom: 6,
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Text>
      ) : null}
      <View style={{ position: "relative" }}>
        {prefix ? (
          <Text
            style={{
              position: "absolute",
              left: 14,
              top: 13,
              color: theme.muted,
              fontSize: 14,
              fontFamily: theme.font.medium,
            }}
          >
            {prefix}
          </Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#3A4A6B"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          style={{
            width: "100%",
            backgroundColor: theme.surfaceAlt,
            borderWidth: 1.5,
            borderColor: theme.border,
            borderRadius: 12,
            paddingVertical: 13,
            paddingHorizontal: 14,
            paddingLeft: prefix ? 36 : 14,
            color: theme.text,
            fontSize: 14,
            fontFamily: theme.font.medium,
          }}
        />
      </View>
      {hint ? (
        <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 4, fontFamily: theme.font.regular }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
