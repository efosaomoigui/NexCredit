import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import Slider from "@react-native-community/slider";
import { theme } from "../../theme/theme";
import { useStore } from "../../state/store";
import { mapBackendWorkflowStatusToCheckpoint, setCheckpoint } from "../../lib/onboarding";

const PENDING_APPLICATION_ID_KEY = "onboarding_pending_application_id";

export default function ReviewTermsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { actions } = useStore();
  const [offer, setOffer] = useState<any>(null);
  const [bankInfo, setBankInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(0);
  const [tenorDays, setTenorDays] = useState(30);
  const [installments, setInstallments] = useState(1);
  const [interestRate, setInterestRate] = useState(0.035);
  const [processingFee, setProcessingFee] = useState(1500);

  useEffect(() => {
    (async () => {
      const oStr = await SecureStore.getItemAsync("onboarding_loan_offer");
      const bStr = await SecureStore.getItemAsync("onboarding_bank");
      const sStr = await SecureStore.getItemAsync("user_loan_selection");
      if (bStr) setBankInfo(JSON.parse(bStr));
      if (sStr) {
        const s = JSON.parse(sStr);
        setAmount(s.amount);
        setTenorDays(s.tenorDays);
        setInstallments(s.installments);
      }
      if (oStr) setOffer(JSON.parse(oStr));
      try {
        const eligibility = await actions.fetchEligibility();
        if (eligibility.interestRate > 0) setInterestRate(eligibility.interestRate);
        setProcessingFee(eligibility.processingFee);
      } catch {
        // Screen keeps rendering if eligibility fetch is temporarily unavailable.
      }
    })();
  }, []);

  const days = tenorDays;
  const interest = Math.round(amount * interestRate * (days / 30));
  const total = amount + interest + processingFee;
  const perInstallment = Math.round(total / installments);

  const handleAccept = async () => {
    if (loading) return;
    setLoading(true);
    try {
      let applicationId = await SecureStore.getItemAsync(PENDING_APPLICATION_ID_KEY);

      // 1. Submit Application once, then reuse on retry.
      if (!applicationId) {
        applicationId = await actions.submitApplication({
          amount: amount,
          tenorDays: days,
          purpose: offer?.purpose || "Personal"
        });
        await SecureStore.setItemAsync(PENDING_APPLICATION_ID_KEY, applicationId);
      }
      const acceptance = await actions.acceptOffer(applicationId);

      // 2. Clear onboarding state and move to success
      await SecureStore.deleteItemAsync(PENDING_APPLICATION_ID_KEY);
      const nextCheckpoint = mapBackendWorkflowStatusToCheckpoint(acceptance.applicationStatus) || "offer_accepted";
      await setCheckpoint(nextCheckpoint);
      navigation.navigate("DisbursementStatus");
    } catch (e: any) {
      const message = e?.message || "Failed to accept offer";
      alert(message);
      const upper = String(message).toUpperCase();
      if (upper.includes("ACTIVE_LOAN_EXISTS") || upper.includes("ALREADY HAVE AN ACTIVE LOAN")) {
        await setCheckpoint("complete");
        navigation.reset({ index: 0, routes: [{ name: "Main", params: { screen: "Loans" } }] });
      }
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => "₦" + n.toLocaleString();

  return (
    <View style={styles.container}>
      {/* Offer Hero (navy) */}
      <View style={[styles.hero, { paddingTop: insets.top + 52 }]}>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}><Text style={styles.logoText}>NC</Text></View>
          <Text style={styles.logoName}>Monivo</Text>
        </View>
        <Text style={styles.approvedTitle}>Final review of your loan</Text>
        <Text style={styles.amountBig}>{fmt(amount)}</Text>
        <View style={styles.tag}>
          <Text style={styles.tagText}>3.5% / month · {days} Days</Text>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
      >
        {/* Info card */}
        <View style={styles.infoCard}>
          {[
            { key: "Loan Amount", val: fmt(amount) },
            { key: "Total Interest", val: fmt(interest) },
            { key: "Processing Fee", val: fmt(processingFee) },
            { key: "Total Repayment", val: fmt(total), bold: true },
            { key: "Disburse to", val: bankInfo ? `${bankInfo.bank} •••• ${bankInfo.accountNumber.slice(-4)}` : "Loading...", green: true },
          ].map((row, idx, arr) => (
            <View
              key={row.key}
              style={[styles.infoRow, idx < arr.length - 1 && styles.infoRowBorder]}
            >
              <Text style={styles.infoKey}>{row.key}</Text>
              <Text
                style={[
                  styles.infoVal,
                  row.bold && { fontFamily: theme.font.extrabold, fontSize: 15 },
                  row.green && { color: theme.colors.success },
                ]}
              >
                {row.val}
              </Text>
            </View>
          ))}
        </View>

        {/* Repayment Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.sliderLabel}>REPAYMENT SCHEDULE</Text>
          <View style={styles.scheduleList}>
            {Array.from({ length: installments }).map((_, i) => {
              const stageDays = Math.round((days / installments) * (i + 1));
              const d = new Date();
              d.setDate(d.getDate() + stageDays);
              const dateStr = d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
              
              return (
                <View key={i} style={[styles.scheduleRow, i < installments - 1 && styles.scheduleRowBorder]}>
                  <View style={styles.scheduleLeft}>
                    <View style={styles.stageCircle}>
                      <Text style={styles.stageNum}>{i + 1}</Text>
                    </View>
                    <View>
                      <Text style={styles.stageTitle}>Stage {i + 1}</Text>
                      <Text style={styles.stageDate}>{dateStr}</Text>
                    </View>
                  </View>
                  <Text style={styles.stageAmount}>{fmt(perInstallment)}</Text>
                </View>
              );
            })}
          </View>
          {installments > 1 && (
            <Text style={styles.breakdownNote}>
              You will pay {fmt(perInstallment)} in {installments} installments over {days} days.
            </Text>
          )}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerText}>
            By accepting, you confirm you have read and understood all loan terms above.
          </Text>
        </View>

        {/* Two buttons */}
        <View style={styles.btnRow}>
          <Pressable style={styles.ghostBtn} disabled={loading} onPress={() => navigation.navigate("Main")}>
            <Text style={styles.ghostBtnText}>Decline</Text>
          </Pressable>
          <Pressable style={styles.ctaBtn} disabled={loading} onPress={handleAccept}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaBtnText}>Accept Offer ✓</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },

  hero: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: "center",
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  logoBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: theme.colors.accent, fontFamily: theme.font.extrabold, fontSize: 11 },
  logoName: { fontFamily: theme.font.bold, fontSize: 13, color: "#FFFFFF" },
  approvedLabel: {
    fontFamily: theme.font.body,
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  approvedTitle: {
    fontFamily: theme.font.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 2,
  },
  amountBig: {
    fontFamily: theme.font.extrabold,
    fontSize: 48,
    color: theme.colors.accent,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: "#EEEDF8",
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  tagText: {
    fontFamily: theme.font.bodyMedium,
    fontSize: 11,
    color: theme.colors.primary,
  },

  body: { flex: 1 },
  bodyContent: { padding: 20, gap: 14, paddingBottom: 40 },

  sliderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
  },
  sliderLabel: {
    fontFamily: theme.font.extrabold,
    fontSize: 11,
    color: theme.colors.primary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sliderSub: {
    fontFamily: theme.font.body,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 8,
  },
  pill: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  pillActive: {
    borderColor: theme.colors.primary,
    backgroundColor: "#EEEDF8",
  },
  pillText: {
    fontFamily: theme.font.bodyMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  pillTextActive: {
    fontFamily: theme.font.bold,
    color: theme.colors.primary,
  },
  tickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  tick: {
    fontFamily: theme.font.body,
    fontSize: 10,
    color: theme.colors.textSecondary,
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoKey: {
    fontFamily: theme.font.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  infoVal: {
    fontFamily: theme.font.bold,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },

  disclaimerCard: {
    backgroundColor: "rgba(245,166,35,0.08)",
    borderRadius: 13,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.18)",
  },
  disclaimerText: {
    fontFamily: theme.font.body,
    fontSize: 12,
    color: "#9a6a00",
    lineHeight: 19,
  },

  btnRow: {
    flexDirection: "row",
    gap: 12,
  },
  ghostBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostBtnText: {
    fontFamily: theme.font.bold,
    fontSize: 14,
    color: theme.colors.primary,
  },
  ctaBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBtnText: { fontFamily: theme.font.bold, fontSize: 14, color: "#FFFFFF" },
  breakdownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
  },
  scheduleList: {
    marginTop: 12,
    backgroundColor: "#F8F9FE",
    borderRadius: 12,
    padding: 4,
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  scheduleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  scheduleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stageCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stageNum: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: theme.font.bold,
  },
  stageTitle: {
    fontFamily: theme.font.bold,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  stageDate: {
    fontFamily: theme.font.body,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  stageAmount: {
    fontFamily: theme.font.bold,
    fontSize: 14,
    color: theme.colors.primary,
  },
  breakdownNote: {
    fontFamily: theme.font.body,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
  stageControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    gap: 20,
    marginTop: 8,
  },
  stageBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F4F4FA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stageBtnText: {
    fontSize: 24,
    color: theme.colors.primary,
    fontFamily: theme.font.bold,
  },
  stageDisplay: {
    alignItems: "center",
    minWidth: 80,
  },
  stageValue: {
    fontFamily: theme.font.extrabold,
    fontSize: 22,
    color: theme.colors.primary,
  },
  stageLabelText: {
    fontFamily: theme.font.body,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: -2,
  },
});


