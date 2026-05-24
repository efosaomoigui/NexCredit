import React from "react";
import { Pressable, Text, View, Platform, StyleSheet } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme/theme";

const NAV_ITEMS: Record<string, { emoji: string; label: string }> = {
  Home: { emoji: "🏠", label: "Home" },
  Repay: { emoji: "💳", label: "Repay" },
  Apply: { emoji: "💰", label: "Borrow" },
  Profile: { emoji: "👤", label: "Profile" },
};

export function BottomNavBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 6),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const navItem = NAV_ITEMS[route.name] || { emoji: "•", label: route.name };

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.navItem}
          >
            <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
              <Text style={styles.emoji}>{navItem.emoji}</Text>
            </View>
            <Text style={[styles.label, isFocused && styles.labelActive]}>
              {navItem.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
    }),
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: "rgba(30,20,96,0.07)",
  },
  emoji: {
    fontSize: 18,
  },
  label: {
    fontFamily: theme.font.body,
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  labelActive: {
    color: theme.colors.primary,
    fontFamily: theme.font.bodyMedium,
  },
});
