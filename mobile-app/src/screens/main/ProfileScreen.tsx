import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { theme } from "../../theme/theme";
import { useStore } from "../../state/store";

type SettingItemProps = {
  emoji: string;
  title: string;
  sub?: string;
  onPress?: () => void;
  danger?: boolean;
};

function SettingItem({ emoji, title, sub, onPress, danger }: SettingItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.settingItem, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={[styles.settingIconBox, danger && { backgroundColor: "rgba(239,68,68,0.08)" }]}>
        <Text style={{ fontSize: 17 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingTitle, danger && { color: theme.colors.error }]}>
          {title}
        </Text>
        {sub ? <Text style={styles.settingSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function ProfileScreen({ onLogout }: { onLogout?: () => void }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { state, actions } = useStore();
  const borrower = state.borrower;

  const initials = borrower.fullName
    .split(" ")
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase() ?? "")
    .join("") || "U";

  const handleLogout = async () => {
    await actions.signOut();
    await SecureStore.deleteItemAsync("token");
    await SecureStore.deleteItemAsync("biometric_enabled");
    await SecureStore.deleteItemAsync("user_phone");
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: "Login" }] })
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}> 
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable
          style={styles.supportBtn}
          onPress={() => navigation.navigate("Support")}
        >
          <Text style={{ fontSize: 18 }}>🎧</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.userHero}>
          <View style={styles.initialsBox}>
            <Text style={styles.initialsText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{borrower.fullName || "Guest User"}</Text>
            <Text style={styles.userPhone}>
              {borrower.phoneOrEmail || "+234 ••• ••• ••••"}
            </Text>
            <View style={styles.tierBadge}>
              <Text style={styles.tierEmoji}>⭐</Text>
              <Text style={styles.tierText}>{borrower.tierLabel || "New Borrower"}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.settingsList}>
          <SettingItem emoji="👤" title="Personal Information" />
          <SettingItem
            emoji="🏦"
            title="Bank Accounts"
            sub={borrower.bankLinked ? "1 account linked" : "No accounts linked"}
          />
          <SettingItem emoji="🔐" title="Security & PIN" />
          <SettingItem emoji="📄" title="Loan Documents" />
        </View>

        <Text style={styles.sectionTitle}>Support & Help</Text>
        <View style={styles.settingsList}>
          <SettingItem emoji="❓" title="Help Center" />
          <SettingItem
            emoji="💬"
            title="Contact Support"
            onPress={() => navigation.navigate("Support")}
          />
        </View>

        <Text style={styles.sectionTitle}>Account Actions</Text>
        <View style={styles.settingsList}>
          <SettingItem
            emoji="🚪"
            title="Sign out"
            danger
            onPress={onLogout || handleLogout}
          />
        </View>

        <Text style={styles.version}>NexCredit v2.4.1 · Build 8902</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  scrollContent: { flexGrow: 1 },
  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: theme.font.bold,
    fontSize: 22,
    color: "#FFFFFF",
  },
  supportBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  userHero: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  initialsBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  initialsText: {
    fontFamily: theme.font.bold,
    fontSize: 22,
    color: theme.colors.accent,
  },
  userName: {
    fontFamily: theme.font.bold,
    fontSize: 17,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  userPhone: {
    fontFamily: theme.font.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245,166,35,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  tierEmoji: { fontSize: 9 },
  tierText: {
    fontFamily: theme.font.bold,
    fontSize: 10,
    color: theme.colors.accent,
    letterSpacing: 0.4,
  },

  sectionTitle: {
    fontFamily: theme.font.bold,
    fontSize: 11,
    color: theme.colors.primary,
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
  },
  settingsList: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },

  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(30,20,96,0.06)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  settingTitle: {
    fontFamily: theme.font.bodyMedium,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  settingSub: {
    fontFamily: theme.font.body,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 18,
    color: theme.colors.textSecondary,
  },

  version: {
    fontFamily: theme.font.body,
    textAlign: "center",
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 32,
    marginBottom: 8,
  },
});
