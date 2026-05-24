import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { theme } from "../../theme/theme";

const TENOR_OPTIONS = [
  { label: "7 Days", days: 7 },
  { label: "15 Days", days: 15 },
  { label: "21 Days", days: 21 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
];

const PURPOSE_OPTIONS = ["Personal", "Business", "Education", "Medical", "Emergency"];

export default function ApplyScreen() {
  const [amount, setAmount] = useState(15000);
  const [tenor, setTenor] = useState(30);
  const [installments, setInstallments] = useState(1);
  const [purpose, setPurpose] = useState("Personal");
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const monthlyRate = 0.035;
  const interest = Math.round(amount * monthlyRate * (tenor / 30));
  const fee = 1500;
  const total = amount + interest + fee;
  const perInstallment = Math.round(total / installments);

  return (
    <View style={styles.container}>
      {/* Navy Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.stepLabel}>Loan Application</Text>
          <Text style={styles.headline}>How much{"\n"}do you need?</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Slider */}
        <View style={styles.formGroup}>
          <View style={styles.amountDisplay}>
            <Text style={styles.amountLabel}>LOAN AMOUNT</Text>
            <Text style={styles.amountValue}>₦{amount.toLocaleString()}</Text>
          </View>
          <View style={styles.sliderBox}>
            <Slider
              style={{ width: "100%", height: 40 }}
              minimumValue={1000}
              maximumValue={25000}
              step={500}
              value={amount}
              onValueChange={(val) => setAmount(Math.round(val))}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.border}
              thumbTintColor={theme.colors.accent}
            />
            <View style={styles.sliderLimits}>
              <Text style={styles.sliderLimit}>₦1,000</Text>
              <Text style={styles.sliderLimit}>₦25,000</Text>
            </View>
          </View>
        </View>

        {/* Tenor */}
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>DURATION</Text>
          <View style={styles.tenorRow}>
            {TENOR_OPTIONS.map((t) => (
              <Pressable
                key={t.days}
                style={[styles.tenorChip, tenor === t.days && styles.tenorChipActive]}
                onPress={() => setTenor(t.days)}
              >
                <Text style={[styles.tenorChipText, tenor === t.days && styles.tenorChipTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Purpose */}
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>LOAN PURPOSE</Text>
          <View style={styles.purposeGrid}>
            {PURPOSE_OPTIONS.map((p) => (
              <Pressable
                key={p}
                style={[styles.purposeChip, purpose === p && styles.purposeChipActive]}
                onPress={() => setPurpose(p)}
              >
                <Text style={[styles.purposeText, purpose === p && styles.purposeTextActive]}>
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Repayment Stages */}
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>REPAYMENT STAGES</Text>
          <View style={styles.stageControl}>
            <Pressable 
              style={styles.stageBtn} 
              onPress={() => setInstallments(prev => Math.max(1, prev - 1))}
            >
              <Text style={styles.stageBtnText}>−</Text>
            </Pressable>
            <View style={styles.stageDisplay}>
              <Text style={styles.stageValue}>{installments}</Text>
              <Text style={styles.stageLabelText}>{installments === 1 ? "Payment" : "Payments"}</Text>
            </View>
            <Pressable 
              style={styles.stageBtn} 
              onPress={() => setInstallments(prev => Math.min(4, prev + 1))}
            >
              <Text style={styles.stageBtnText}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* Repayment Schedule */}
        <View style={styles.breakdownCard}>
          <Text style={styles.fieldLabel}>REPAYMENT SCHEDULE</Text>
          <View style={styles.scheduleList}>
            {Array.from({ length: installments }).map((_, i) => {
              const stageDays = Math.round((tenor / installments) * (i + 1));
              const d = new Date();
              d.setDate(d.getDate() + stageDays);
              const dateStr = d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
              
              return (
                <View key={i} style={[styles.scheduleRow, i < installments - 1 && styles.scheduleRowBorder]}>
                  <Text style={styles.stageTitle}>Stage {i + 1} ({dateStr})</Text>
                  <Text style={styles.stageAmount}>₦{perInstallment.toLocaleString()}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownTotalKey}>Total Repayment</Text>
            <Text style={styles.breakdownTotalVal}>₦{total.toLocaleString()}</Text>
          </View>
        </View>

        {/* CTA */}
        <Pressable
          style={styles.ctaBtn}
          onPress={async () => {
            const selection = { amount, tenorDays: tenor, installments, purpose };
            await SecureStore.setItemAsync("user_loan_selection", JSON.stringify(selection));
            navigation.navigate("ReviewTerms");
          }}
        >
          <Text style={styles.ctaBtnText}>Get Loan →</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },

  // Header
  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingBottom: 28,
    position: "relative",
  },
  backBtn: {
    position: "absolute",
    top: 56,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  backArrow: { color: "#FFFFFF", fontSize: 26, lineHeight: 28, marginTop: -2 },
  headerContent: { marginTop: 64 },
  stepLabel: {
    fontFamily: theme.font.body,
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  headline: {
    fontFamily: theme.font.extrabold,
    fontSize: 28,
    color: "#FFFFFF",
    lineHeight: 36,
    marginBottom: 4,
  },
  subText: {
    fontFamily: theme.font.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
  },

  scrollContent: { padding: 20, gap: 0 },

  // Form group
  formGroup: { marginBottom: 22 },
  fieldLabel: {
    fontFamily: theme.font.bold,
    fontSize: 10,
    color: theme.colors.primary,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  // Amount display
  amountDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  amountLabel: {
    fontFamily: theme.font.bold,
    fontSize: 10,
    color: theme.colors.primary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  amountValue: {
    fontFamily: theme.font.extrabold,
    fontSize: 26,
    color: theme.colors.primary,
  },
  sliderBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  sliderLimits: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sliderLimit: {
    fontFamily: theme.font.body,
    fontSize: 10,
    color: theme.colors.textSecondary,
  },

  // Tenor chips
  tenorRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tenorChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: "#FFFFFF",
  },
  tenorChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  tenorChipText: {
    fontFamily: theme.font.bodyMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  tenorChipTextActive: { color: "#FFFFFF" },

  // Purpose chips
  purposeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  purposeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: "#FFFFFF",
  },
  purposeChipActive: {
    borderColor: theme.colors.accent,
    backgroundColor: "rgba(245,166,35,0.1)",
  },
  purposeText: {
    fontFamily: theme.font.body,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  purposeTextActive: {
    color: "#9a6a00",
    fontFamily: theme.font.bold,
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
  scheduleList: {
    backgroundColor: "#F8F9FE",
    borderRadius: 12,
    padding: 4,
    marginTop: 8,
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
  },
  scheduleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  stageTitle: {
    fontFamily: theme.font.bodyMedium,
    fontSize: 12,
    color: theme.colors.textPrimary,
  },
  stageAmount: {
    fontFamily: theme.font.bold,
    fontSize: 13,
    color: theme.colors.primary,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
  },
  breakdownKey: {
    fontFamily: theme.font.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  breakdownVal: {
    fontFamily: theme.font.bold,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 6,
  },
  breakdownTotalKey: {
    fontFamily: theme.font.bold,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  breakdownTotalVal: {
    fontFamily: theme.font.extrabold,
    fontSize: 18,
    color: theme.colors.primary,
  },

  // Info note
  infoNote: {
    backgroundColor: "rgba(245,166,35,0.07)",
    borderRadius: 13,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.15)",
  },
  infoNoteIcon: { fontSize: 14 },
  infoNoteText: {
    flex: 1,
    fontFamily: theme.font.body,
    fontSize: 12,
    color: "#9a6a00",
    lineHeight: 19,
  },

  // CTA
  ctaBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBtnText: {
    fontFamily: theme.font.bold,
    fontSize: 15,
    color: "#FFFFFF",
  },
});
