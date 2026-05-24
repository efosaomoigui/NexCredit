import React from "react";
import { StyleProp, View, ViewStyle, Platform } from "react-native";
import { theme } from "../../theme/theme";

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: 20, // Increased radius as per NexCredit.jsx
          borderWidth: 1,
          borderColor: theme.border,
          ...Platform.select({
            ios: {
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 16,
            },
            android: {
              elevation: 3,
            },
          }),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
