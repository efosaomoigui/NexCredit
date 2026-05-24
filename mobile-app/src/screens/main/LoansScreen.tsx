import React, { useState, useEffect } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { theme } from "../../theme/theme";
import { useStore, LoanStatus } from "../../state/store";

const STATUS_CONFIG: Record<LoanStatus, { label: string; color: string; bg: string }> = {
  DRAFT:          { label: "Draft",      color: theme.colors.textSecondary, bg: "rgba(153,153,170,0.1)" },
  SUBMITTED:      { label: "Submitted",  color: theme.colors.primary,       bg: "rgba(30,20,96,0.08)" },
  PENDING_REVIEW: { label: "In Review",  color: theme.colors.primary,       bg: "rgba(30,20,96,0.08)" },
  APPROVED:       { label: "Approved",   color: theme.colors.success,       bg: "rgba(34,197,94,0.1)" },
  DISBURSED:      { label: "Disbursed",  color: theme.colors.success,       bg: "rgba(34,197,94,0.1)" },
  ACTIVE:         { label: "Active",     color: theme.colors.success,       bg: "rgba(34,197,94,0.1)" },
  OVERDUE:        { label: "Overdue",    color: theme.colors.error,         bg: "rgba(239,68,68,0.1)" },
  FULLY_REPAID:   { label: "Paid ✓",     color: theme.colors.accent,        bg: "rgba(245,166,35,0.1)" },
  REJECTED:       { label: "Rejected",   color: theme.colors.error,         bg: "rgba(239,68,68,0.1)" },
};

export default function LoansScreen({ onNav }: { onNav?: (tab: string) => void }) {
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { state, actions } = useStore();

  useEffect(() => {
    actions.fetchLoans().catch(() => null);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await actions.fetchLoans().catch(() => null);
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}> 
        <Text style={styles.headerTitle}>My Loans</Text>
        <Text style={styles.headerSub}>Your borrowing history</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
      >
        {state.loans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>Document</Text>
            <Text style={styles.emptyTitle}>No loans yet</Text>
            <Text style={styles.emptyDesc}>
              You haven't applied for any loans yet. Tap below to get started.
            </Text>
            <Pressable
              style={styles.applyBtn}
              onPress={() => {
                if (onNav) onNav("Apply");
                else navigation.navigate("Apply");
              }}
            >
              <Text style={styles.applyBtnText}>Apply for a Loan →</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.loanList}>
            {state.loans.map((loan) => {
              const cfg = STATUS_CONFIG[loan.status] ?? STATUS_CONFIG.DRAFT;
              return (
                <View key={loan.id} style={styles.loanCard}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.loanName}>{loan.name}</Text>
                      <Text style={styles.loanRef}>Ref: #{loan.id.slice(0, 8).toUpperCase()}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}> 
                      <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>

                  <View style={styles.amountRow}>
                    <View>
                      <Text style={styles.metaLabel}>Principal</Text>
                      <Text style={styles.metaValue}>₦{loan.principal.toLocaleString()}</Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={styles.metaLabel}>Total</Text>
                      <Text style={styles.metaValue}>₦{loan.totalRepayable.toLocaleString()}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.metaLabel}>Balance</Text>
                      <Text style={[styles.metaValue, { color: loan.outstanding > 0 ? theme.colors.error : theme.colors.success }]}>
                        ₦{loan.outstanding.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.dueDate}>
                      {loan.dueDateISO
                        ? `Due: ${new Date(loan.dueDateISO).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
                        : "Pending review"}
                    </Text>
                    {loan.status === "ACTIVE" || loan.status === "OVERDUE" ? (
                      <Pressable style={styles.repayBtn} onPress={() => navigation.navigate("Repay")}>
                        <Text style={styles.repayBtnText}>Repay →</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}

            <Pressable
              style={styles.newLoanBtn}
              onPress={() => {
                if (onNav) onNav("Apply");
                else navigation.navigate("Apply");
              }}
            >
              <Text style={styles.newLoanBtnText}>+ Apply for New Loan</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: theme.font.bold,
    fontSize: 24,
    color: "#FFFFFF",
    marginBottom: 2,
  },
  headerSub: {
    fontFamily: theme.font.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
  },
  scrollContent: { padding: 16 },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyEmoji: { fontSize: 20, color: theme.colors.textSecondary },
  emptyTitle: {
    fontFamily: theme.font.bold,
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  emptyDesc: {
    fontFamily: theme.font.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
  },
  applyBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 13,
    marginTop: 8,
  },
  applyBtnText: {
    fontFamily: theme.font.bold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  loanList: { gap: 14 },
  loanCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    gap: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  loanName: {
    fontFamily: theme.font.bold,
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  loanRef: {
    fontFamily: theme.font.body,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: {
    fontFamily: theme.font.bold,
    fontSize: 11,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  metaLabel: {
    fontFamily: theme.font.body,
    fontSize: 10,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metaValue: {
    fontFamily: theme.font.bold,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  dueDate: {
    fontFamily: theme.font.body,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  repayBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  repayBtnText: {
    fontFamily: theme.font.bold,
    fontSize: 12,
    color: "#FFFFFF",
  },
  newLoanBtn: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  newLoanBtnText: {
    fontFamily: theme.font.bold,
    fontSize: 14,
    color: theme.colors.primary,
  },
});
