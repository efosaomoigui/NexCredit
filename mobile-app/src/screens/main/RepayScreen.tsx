import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme/theme";
import { useStore } from "../../state/store";

const PAYMENT_METHODS = [
  { key: "bank", label: "Bank Transfer", sub: "Pay from your bank app", emoji: "🏦", bg: "rgba(30,20,96,0.07)" },
  { key: "ussd", label: "USSD", sub: "*737# · *901# · *000#", emoji: "📱", bg: "rgba(245,166,35,0.1)" },
  { key: "card", label: "Debit Card", sub: "Visa, Verve, Mastercard", emoji: "💳", bg: "#dcfce7" },
  { key: "wallet", label: "Opay / PalmPay", sub: "Pay with mobile wallet", emoji: "👛", bg: "#E8F5E9" },
];

export default function RepayScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { state, actions } = useStore();
  const [selectedMethod, setSelectedMethod] = useState("bank");
  const [submitting, setSubmitting] = useState(false);

  const activeLoan = state.loans.find((loan) => loan.status === "ACTIVE" || loan.status === "OVERDUE") || state.loans[0];
  const stageDueAmount = activeLoan?.outstanding || 0;
  const paidAmount = activeLoan ? Math.max(0, activeLoan.totalRepayable - activeLoan.outstanding) : 0;
  const progressPct = activeLoan && activeLoan.totalRepayable > 0 ? Math.min(100, Math.round((paidAmount / activeLoan.totalRepayable) * 100)) : 0;

  const submitRepayment = async () => {
    if (!activeLoan) {
      alert("No active loan available for repayment.");
      return;
    }
    const parsedAmount = Number(stageDueAmount || 0);
    if (!parsedAmount || parsedAmount <= 0) {
      alert("No payment is currently due on this loan.");
      return;
    }

    setSubmitting(true);
    try {
      await actions.repay({ loanId: activeLoan.id, amount: parsedAmount });
      alert("Repayment initiated successfully.");
      await actions.fetchLoans();
      navigation.goBack();
    } catch (e: any) {
      alert(e?.message || "Unable to initiate repayment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}> 
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <View style={{ marginTop: 16 }}>
          <Text style={styles.headerLabel}>Repay Loan</Text>
          <View style={styles.amountRow}>
            <Text style={styles.headerAmount}>₦{stageDueAmount.toLocaleString()}</Text>
            <Text style={styles.headerAmountEst}> due now</Text>
          </View>
          <Text style={styles.headerSub}>
            {activeLoan?.dueDateISO ? `Due ${new Date(activeLoan.dueDateISO).toLocaleDateString("en-NG")} · ` : ""}
            Loan #{activeLoan?.id?.slice(0, 8).toUpperCase() || "N/A"}
          </Text>
          <View style={styles.progressCard}>
            <View style={styles.progressMeta}>
              <Text style={styles.progressKey}>Total Loan</Text>
              <Text style={styles.progressVal}>₦{activeLoan ? activeLoan.totalRepayable.toLocaleString() : "0"}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <View style={styles.progressMeta}>
              <Text style={styles.progressSub}>₦{paidAmount.toLocaleString()} paid</Text>
              <Text style={styles.progressSub}>₦{activeLoan ? activeLoan.outstanding.toLocaleString() : "0"} remaining</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={[styles.card, { padding: 0 }]}>
          <View style={styles.methodHeader}>
            <Text style={styles.cardLabel}>PAYMENT METHOD</Text>
          </View>
          {PAYMENT_METHODS.map((method) => (
            <Pressable key={method.key} style={styles.methodRow} onPress={() => setSelectedMethod(method.key)}>
              <View style={[styles.methodIcon, { backgroundColor: method.bg }]}>
                <Text style={{ fontSize: 19 }}>{method.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodLabel}>{method.label}</Text>
                <Text style={styles.methodSub}>{method.sub}</Text>
              </View>
              <View style={[styles.radio, selectedMethod === method.key && styles.radioActive]}>
                {selectedMethod === method.key && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.ctaBtn} onPress={submitRepayment} disabled={submitting}>
          <Text style={styles.ctaBtnText}>{submitting ? "Processing..." : "Make Payment →"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: { backgroundColor: theme.colors.primary, paddingHorizontal: 22, paddingBottom: 24, position: "relative" },
  backBtn: { position: "absolute", top: 56, left: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", zIndex: 10 },
  backArrow: { color: "#FFFFFF", fontSize: 26, lineHeight: 28, marginTop: -2 },
  headerLabel: { fontFamily: theme.font.body, fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 0.8 },
  amountRow: { flexDirection: "row", alignItems: "baseline" },
  headerAmount: { fontFamily: theme.font.extrabold, fontSize: 32, color: theme.colors.accent, marginVertical: 4 },
  headerAmountEst: { fontFamily: theme.font.body, fontSize: 16, color: "rgba(255,255,255,0.45)" },
  headerSub: { fontFamily: theme.font.body, fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 14 },
  progressCard: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 14 },
  progressMeta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressKey: { fontFamily: theme.font.body, fontSize: 11, color: "rgba(255,255,255,0.45)" },
  progressVal: { fontFamily: theme.font.bold, fontSize: 11, color: "#FFFFFF" },
  progressTrack: { height: 8, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 4, overflow: "hidden", marginBottom: 6 },
  progressFill: { height: "100%", backgroundColor: theme.colors.accent, borderRadius: 4 },
  progressSub: { fontFamily: theme.font.body, fontSize: 10, color: "rgba(255,255,255,0.35)" },
  body: { flex: 1 },
  bodyContent: { padding: 18, gap: 14, paddingBottom: 40 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16 },
  cardLabel: { fontFamily: theme.font.bold, fontSize: 11, color: theme.colors.primary, letterSpacing: 0.8, marginBottom: 10 },
  methodHeader: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  methodRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: theme.colors.border },
  methodIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  methodLabel: { fontFamily: theme.font.semibold, fontSize: 13, color: theme.colors.textPrimary },
  methodSub: { fontFamily: theme.font.body, fontSize: 11, color: theme.colors.textSecondary },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: theme.colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary },
  ctaBtn: { backgroundColor: theme.colors.accent, borderRadius: 16, height: 54, alignItems: "center", justifyContent: "center" },
  ctaBtnText: { fontFamily: theme.font.bold, fontSize: 15, color: theme.colors.primary },
});
