import React, { useState, useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Slider from "@react-native-community/slider";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { theme } from "../../theme/theme";
import { setCheckpoint } from "../../lib/onboarding";
import { MoveRight } from "lucide-react-native";
import { useStore } from "../../state/store";

export default function LoanConfigurationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { actions } = useStore();

  const [amount, setAmount] = useState(0);
  const [amountInput, setAmountInput] = useState("");
  const [isAmountEditing, setIsAmountEditing] = useState(false);
  const [maxLimit, setMaxLimit] = useState(25000);
  const [tenorDays, setTenorDays] = useState(30);
  const [installments, setInstallments] = useState(1);
  const [stagesOpen, setStagesOpen] = useState(false);
  const [interestRate, setInterestRate] = useState(0.26);

  const stageRate = interestRate;
  const processingFee = 1500;
  const principalPerStage = Math.round(amount / installments);
  const interestPerStage = Math.round(amount * stageRate);
  const perInstallment = principalPerStage + interestPerStage;
  const interest = interestPerStage * installments;
  const totalRepayment = amount + interest + processingFee;

  useEffect(() => {
    (async () => {
      const oStr = await SecureStore.getItemAsync("onboarding_loan_offer");
      if (oStr) {
        const o = JSON.parse(oStr);
        const initial = o.maxLimit || 25000;
        setMaxLimit(initial);
        setAmount(initial);
        setAmountInput(`${NAIRA}${initial.toLocaleString()}`);
      }
      try {
        const eligibility = await actions.fetchEligibility();
        const backendRate = Number(eligibility.interestRate);
        if (!Number.isNaN(backendRate) && backendRate > 0) {
          setInterestRate(backendRate);
        }
      } catch {
        // Keep fallback 26% when backend rate is unavailable.
      }
    })();
  }, [actions]);

  const handleContinue = async () => {
    const selection = { amount, tenorDays, installments };
    await SecureStore.setItemAsync("user_loan_selection", JSON.stringify(selection));
    await setCheckpoint("offer_ready");
    navigation.navigate("ReviewTerms");
  };

  const NAIRA = "\u20A6";
  const fmt = (n: number) => `${NAIRA}${n.toLocaleString()}`;
  const clampAmount = (n: number) => Math.max(5000, Math.min(maxLimit, n));

  const handleAmountInputChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    setAmountInput(digits);
    if (!digits) return;
    const parsed = Number(digits);
    if (Number.isNaN(parsed)) return;
    setAmount(clampAmount(parsed));
  };

  const handleAmountInputBlur = () => {
    setIsAmountEditing(false);
    if (!amountInput) {
      setAmount(5000);
      setAmountInput(`${NAIRA}${(5000).toLocaleString()}`);
      return;
    }
    const parsed = Number(amountInput);
    const next = Number.isNaN(parsed) ? 5000 : clampAmount(parsed);
    setAmount(next);
    setAmountInput(`${NAIRA}${next.toLocaleString()}`);
  };

  const handleAmountInputFocus = () => {
    setIsAmountEditing(true);
    setAmountInput(String(amount));
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}> 
        <View style={styles.headerContent}>
          <Text style={styles.headline}>Apply for Loan</Text>
          <Text style={styles.subText}>Choose the amount and repayment plan that works for you.</Text>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.card}>
          <Text style={styles.label}>HOW MUCH DO YOU NEED?</Text>
          <TextInput
            style={styles.amountTextInput}
            value={amountInput}
            onChangeText={handleAmountInputChange}
            onFocus={handleAmountInputFocus}
            onBlur={handleAmountInputBlur}
            keyboardType="number-pad"
            placeholder={`${NAIRA}0`}
            placeholderTextColor="#C8C8D8"
            textAlign="center"
          />
          <Slider
            minimumValue={5000}
            maximumValue={maxLimit}
            step={1000}
            value={amount}
            onValueChange={(val) => {
              const next = clampAmount(Math.round(val));
              setAmount(next);
              setAmountInput(isAmountEditing ? String(next) : `${NAIRA}${next.toLocaleString()}`);
            }}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.primary}
            style={{ width: "100%", height: 50 }}
          />
          <View style={styles.tickRow}>
            <Text style={styles.tick}>{NAIRA}5,000</Text>
            <Text style={styles.tick}>{fmt(maxLimit)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>FOR HOW LONG?</Text>
          <View style={styles.tenorRow}>
            {[7, 15, 21, 30, 90].map((d) => (
              <Pressable key={d} style={[styles.tenorChip, tenorDays === d && styles.tenorChipActive]} onPress={() => setTenorDays(d)}>
                <Text style={[styles.tenorChipText, tenorDays === d && styles.tenorChipTextActive]}>{d}d</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>REPAYMENT STAGES</Text>
          <View style={styles.stageControl}>
            <Pressable style={styles.stageBtn} onPress={() => setInstallments((prev) => Math.max(1, prev - 1))}>
              <Text style={styles.stageBtnText}>-</Text>
            </Pressable>
            <View style={styles.stageDisplay}>
              <Text style={styles.stageValue}>{installments}</Text>
              <Text style={styles.stageLabelText}>{installments === 1 ? "Payment" : "Payments"}</Text>
            </View>
            <Pressable style={styles.stageBtn} onPress={() => setInstallments((prev) => Math.min(4, prev + 1))}>
              <Text style={styles.stageBtnText}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>REPAYMENT SCHEDULE</Text>
          <Pressable style={styles.accordionHeader} onPress={() => setStagesOpen((p) => !p)}>
            <Text style={styles.accordionTitle}>Selected Breakdown</Text>
            <Text style={styles.accordionChevron}>{stagesOpen ? "v" : ">"}</Text>
          </Pressable>

          {stagesOpen ? (
            <>
              <View style={styles.scheduleList}>
                {Array.from({ length: installments }).map((_, i) => {
                  const stageDays = Math.round((tenorDays / installments) * (i + 1));
                  const d = new Date();
                  d.setDate(d.getDate() + stageDays);
                  const dateStr = d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
                  return (
                    <View key={i} style={[styles.scheduleRow, i < installments - 1 && styles.scheduleRowBorder]}>
                      <Text style={styles.stageTitle}>Stage {i + 1} ({dateStr})</Text>
                      <Text style={styles.stageAmount}>{fmt(perInstallment)}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownKey}>Total Interest</Text>
                <Text style={styles.breakdownVal}>{fmt(interest)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownKey}>Processing Fee</Text>
                <Text style={styles.breakdownVal}>{fmt(processingFee)}</Text>
              </View>
            </>
          ) : null}
        </View>
        <View style={styles.card}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownTotalKey}>Total Repayment</Text>
            <Text style={styles.breakdownTotalVal}>{fmt(totalRepayment)}</Text>
          </View>
        </View>

        <Pressable style={styles.ctaBtn} onPress={handleContinue}>
          <View style={styles.ctaInline}>
            <Text style={styles.ctaBtnText}>Get Loan</Text>
            <MoveRight size={18} color="#FFFFFF" strokeWidth={1.9} />
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: { backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingBottom: 28 },
  backBtn: { position: "absolute", top: 56, left: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", zIndex: 10 },
  backArrow: { color: "#FFFFFF", fontSize: 24, lineHeight: 26, marginTop: -1 },
  headerContent: { marginTop: 64 },
  headline: { fontFamily: theme.font.extrabold, fontSize: 26, color: "#FFFFFF", marginBottom: 4 },
  subText: { fontFamily: theme.font.body, fontSize: 13, color: "rgba(255,255,255,0.6)" },
  body: { flex: 1 },
  bodyContent: { padding: 20, gap: 16, paddingBottom: 40 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
  label: { fontFamily: theme.font.extrabold, fontSize: 11, color: theme.colors.primary, letterSpacing: 1.2, marginBottom: 12 },
  amountTextInput: {
    fontFamily: theme.font.bold,
    fontSize: 32,
    color: theme.colors.primary,
    textAlign: "center",
    marginBottom: 8,
    paddingVertical: 2,
  },
  tickRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10 },
  tick: { fontFamily: theme.font.body, fontSize: 10, color: theme.colors.textSecondary },
  tenorRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tenorChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 100, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: "#FFFFFF" },
  tenorChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  tenorChipText: { fontFamily: theme.font.bodyMedium, fontSize: 12, color: theme.colors.textSecondary },
  tenorChipTextActive: { color: "#FFFFFF" },
  accordionHeader: {
    backgroundColor: "#F1F3F8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accordionTitle: { fontFamily: theme.font.bold, fontSize: 13, color: theme.colors.textSecondary },
  accordionChevron: { fontFamily: theme.font.bold, fontSize: 14, color: theme.colors.textSecondary },
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
    marginTop: 12,
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
  stageBtnText: { fontSize: 24, color: theme.colors.primary, fontFamily: theme.font.bold },
  stageDisplay: { alignItems: "center", minWidth: 80 },
  stageValue: { fontFamily: theme.font.extrabold, fontSize: 22, color: theme.colors.primary },
  stageLabelText: { fontFamily: theme.font.body, fontSize: 11, color: theme.colors.textSecondary, marginTop: -2 },
  scheduleList: { backgroundColor: "#F8F9FE", borderRadius: 12, padding: 4, marginTop: 12 },
  scheduleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10 },
  scheduleRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.04)" },
  stageTitle: { fontFamily: theme.font.bodyMedium, fontSize: 12, color: theme.colors.textPrimary },
  stageAmount: { fontFamily: theme.font.bold, fontSize: 13, color: theme.colors.primary },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9 },
  breakdownKey: { fontFamily: theme.font.body, fontSize: 13, color: theme.colors.textSecondary },
  breakdownVal: { fontFamily: theme.font.bold, fontSize: 13, color: theme.colors.textPrimary },
  breakdownDivider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 6 },
  breakdownTotalKey: { fontFamily: theme.font.bold, fontSize: 14, color: theme.colors.textPrimary },
  breakdownTotalVal: { fontFamily: theme.font.extrabold, fontSize: 18, color: theme.colors.primary },
  ctaBtn: { backgroundColor: theme.colors.primary, borderRadius: 16, height: 56, alignItems: "center", justifyContent: "center", marginTop: 10 },
  ctaBtnText: { fontFamily: theme.font.bold, fontSize: 16, lineHeight: 18, color: "#FFFFFF" },
  ctaInline: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 1 },
});
