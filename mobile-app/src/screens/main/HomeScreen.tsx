import React, { useState, useCallback, useEffect } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { Bell } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme/theme";
import { useStore } from "../../state/store";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { state, actions } = useStore();

  const [refreshing, setRefreshing] = useState(false);
  const [firstName, setFirstName] = useState("User");

  const activeLoan = state.dashboard.activeLoan;
  const hasActiveLoan = Boolean(activeLoan);

  const loadData = async () => {
    try {
      const profileName = state.borrower?.fullName;
      if (profileName && profileName !== "Guest") {
        setFirstName(profileName.split(" ")[0] || "User");
        return;
      }
      const raw = await SecureStore.getItemAsync("onboarding_personal_info");
      if (raw) {
        const { fullName } = JSON.parse(raw);
        setFirstName(fullName?.split(" ")[0] || "User");
      }
    } catch {}
  };

  useEffect(() => { loadData(); }, [state.borrower?.fullName]);

  useEffect(() => {
    actions.fetchDashboard().catch(() => null);
    actions.fetchLoans().catch(() => null);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await actions.fetchDashboard().catch(() => null);
    await actions.fetchLoans().catch(() => null);
    await loadData();
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const availableLimit = state.dashboard.limit || 0;
  const paidAmount = activeLoan ? Math.max(0, activeLoan.totalRepayable - activeLoan.outstanding) : 0;
  const progressPct = activeLoan && activeLoan.totalRepayable > 0 ? Math.min(100, Math.round((paidAmount / activeLoan.totalRepayable) * 100)) : 0;
  const dueDate = activeLoan?.dueDateISO ? new Date(activeLoan.dueDateISO) : null;
  const dueInDays = dueDate ? Math.max(Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 0) : null;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
      >
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>{firstName}</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable style={styles.iconBtn}>
                <Bell color="#FFFFFF" size={17} strokeWidth={1.4} />
              </Pressable>
              <Pressable
                style={styles.avatarBtn}
                onPress={() => navigation.navigate("Profile")}
              >
                <Text style={styles.avatarText}>
                  {firstName ? firstName[0].toUpperCase() : "U"}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.loanCard}>
            <View style={styles.loanCardTop}>
              <Text style={styles.loanCardLabel}>Available Credit</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{hasActiveLoan ? "Active" : "No Loan"}</Text>
              </View>
            </View>
            <Text style={styles.loanAmount}>₦{availableLimit.toLocaleString()}</Text>
            <Text style={styles.loanCardSub}>Credit limit · refreshes after repayment</Text>
            <View style={styles.divider} />
            <View style={styles.loanCardMeta}>
              <View>
                <Text style={styles.metaLabel}>Loan Balance</Text>
                <Text style={styles.metaValue}>₦{activeLoan ? activeLoan.outstanding.toLocaleString() : "0"}</Text>
              </View>
              <View>
                <Text style={styles.metaLabel}>Due Date</Text>
                <Text style={styles.metaValue}>
                  {dueDate ? dueDate.toLocaleDateString("en-NG", { month: "short", day: "numeric" }) : "--"}
                </Text>
              </View>
              <View>
                <Text style={styles.metaLabel}>Days Left</Text>
                <Text style={[styles.metaValue, { color: theme.colors.accent }]}>{dueInDays ?? "--"}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.quickActionsRow}>
            {[
              { label: "Pay Now", emoji: "💳", onPress: () => navigation.navigate("Repay") },
              { label: "Borrow", emoji: "💸", onPress: () => navigation.navigate("Apply") },
              { label: "Schedule", emoji: "📅", onPress: () => navigation.navigate("Loans") },
              { label: "Profile", emoji: "👤", onPress: () => navigation.navigate("Profile") },
            ].map((action) => (
              <Pressable key={action.label} onPress={action.onPress} style={styles.actionCard}>
                <Text style={styles.actionEmoji}>{action.emoji}</Text>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.creditScoreBanner} onPress={() => navigation.navigate("Profile")}>
            <View style={styles.creditScoreCircle}>
              <Text style={styles.creditScoreNum}>72</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.creditScoreTitle}>Your Credit Score</Text>
              <Text style={styles.creditScoreSub}>Paying early boosts your score by 15%</Text>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 18 }}>›</Text>
          </Pressable>

          {hasActiveLoan ? (
            <View style={styles.paymentDueCard}>
              <View style={styles.paymentDueTop}>
                <Text style={styles.paymentDueTitle}>Payment Due</Text>
                <View style={styles.dueBadge}>
                  <Text style={styles.dueBadgeText}>{dueInDays ?? 0} days</Text>
                </View>
              </View>
              <Text style={styles.paymentDueAmount}>₦{activeLoan ? activeLoan.outstanding.toLocaleString() : "0"}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
              </View>
              <View style={styles.progressMeta}>
                <Text style={styles.progressLabel}>₦{paidAmount.toLocaleString()} paid</Text>
                <Text style={styles.progressLabel}>₦{activeLoan ? activeLoan.outstanding.toLocaleString() : "0"} left</Text>
              </View>
              <Pressable style={styles.payNowBtn} onPress={() => navigation.navigate("Repay")}>
                <Text style={styles.payNowBtnText}>Pay Now →</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.growCard}>
            <View style={styles.growCardBanner}>
              <Text style={styles.growEmoji}>📈</Text>
            </View>
            <View style={styles.growCardBody}>
              <Text style={styles.growTitle}>Grow your credit story</Text>
              <Text style={styles.growDesc}>
                On-time repayments unlock higher loan limits and better interest rates.
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  scrollContent: { flexGrow: 1 },

  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  greeting: {
    fontFamily: theme.font.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.48)",
  },
  userName: {
    fontFamily: theme.font.bold,
    fontSize: 18,
    color: "#FFFFFF",
  },
  headerActions: { flexDirection: "row", gap: 10 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: theme.font.extrabold,
    fontSize: 13,
    color: theme.colors.primary,
  },

  loanCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 18,
  },
  loanCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  loanCardLabel: {
    fontFamily: theme.font.body,
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statusBadge: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontFamily: theme.font.bodyMedium,
    fontSize: 10,
    color: "#4ade80",
  },
  loanAmount: {
    fontFamily: theme.font.extrabold,
    fontSize: 34,
    color: theme.colors.accent,
    marginBottom: 4,
  },
  loanCardSub: {
    fontFamily: theme.font.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 14,
  },
  loanCardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaLabel: {
    fontFamily: theme.font.body,
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 3,
  },
  metaValue: {
    fontFamily: theme.font.bold,
    fontSize: 14,
    color: "#FFFFFF",
  },

  body: { padding: 16, gap: 14 },

  quickActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  actionEmoji: { fontSize: 22 },
  actionLabel: {
    fontFamily: theme.font.bodyMedium,
    fontSize: 10,
    color: theme.colors.textPrimary,
    textAlign: "center",
  },

  creditScoreBanner: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  creditScoreCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(245,166,35,0.15)",
    borderWidth: 3,
    borderColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  creditScoreNum: {
    fontFamily: theme.font.extrabold,
    fontSize: 15,
    color: theme.colors.accent,
  },
  creditScoreTitle: {
    fontFamily: theme.font.bold,
    fontSize: 13,
    color: "#FFFFFF",
    marginBottom: 2,
  },
  creditScoreSub: {
    fontFamily: theme.font.body,
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  },

  paymentDueCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(239,68,68,0.15)",
  },
  paymentDueTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  paymentDueTitle: {
    fontFamily: theme.font.bold,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  dueBadge: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  dueBadgeText: {
    fontFamily: theme.font.bodyMedium,
    fontSize: 10,
    color: theme.colors.error,
  },
  paymentDueAmount: {
    fontFamily: theme.font.extrabold,
    fontSize: 22,
    color: theme.colors.primary,
    marginBottom: 10,
  },
  progressTrack: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 5,
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.accent,
    borderRadius: 3,
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  progressLabel: {
    fontFamily: theme.font.body,
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  payNowBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  payNowBtnText: {
    fontFamily: theme.font.bold,
    fontSize: 13,
    color: "#FFFFFF",
  },

  growCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  growCardBanner: {
    height: 80,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  growEmoji: { fontSize: 36 },
  growCardBody: { padding: 14 },
  growTitle: {
    fontFamily: theme.font.bold,
    fontSize: 13,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  growDesc: {
    fontFamily: theme.font.body,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});
