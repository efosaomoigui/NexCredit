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
import { theme } from "../../theme/theme";
import { useStore } from "../../state/store";
import {
  getBackendCheckpoint,
  getCheckpoint,
  isCheckpointAtOrBeyond,
  mapBackendWorkflowStatusToCheckpoint,
  setCheckpoint,
} from "../../lib/onboarding";

const PENDING_APPLICATION_ID_KEY = "onboarding_pending_application_id";
const ACCEPT_IN_FLIGHT_KEY = "onboarding_accept_in_flight";
const BANK_FETCH_TIMEOUT_MS = 5000;

function isIdentityKycIncomplete(steps?: Record<string, string>): boolean {
  if (!steps) return false;
  const keys = Object.keys(steps);
  const identityKeys = keys.filter((key) => {
    const lower = key.toLowerCase();
    return lower.includes("bvn") || lower.includes("selfie") || lower.includes("face") || lower.includes("identity") || lower.includes("kyc");
  });
  if (!identityKeys.length) return false;
  return identityKeys.some((key) => {
    const status = String(steps[key]).toLowerCase();
    return status !== "verified" && status !== "completed";
  });
}

function isBankStepIncomplete(steps?: Record<string, string>): boolean {
  if (!steps) return false;
  const status = String(steps.bank_account || "").toLowerCase();
  if (!status) return false;
  return status !== "verified" && status !== "completed";
}

export default function ReviewTermsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { actions } = useStore();

  const [offer, setOffer] = useState<any>(null);
  const [bankInfo, setBankInfo] = useState<any>(null);
  const [bankState, setBankState] = useState<"loading" | "data" | "empty" | "error">("loading");
  const [bankError, setBankError] = useState("");

  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(0);
  const [tenorDays, setTenorDays] = useState(30);
  const [installments, setInstallments] = useState(1);
  const [purpose, setPurpose] = useState("Personal");
  const [interestRate, setInterestRate] = useState(0.035);
  const [processingFee, setProcessingFee] = useState(1500);
  const [offerSyncNote, setOfferSyncNote] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [kycBlockMessage, setKycBlockMessage] = useState("");
  const [acceptPhase, setAcceptPhase] = useState<"idle" | "submitting" | "confirming" | "reconciling">("idle");

  const loadBankInfo = async () => {
    setBankState("loading");
    setBankError("");
    setBankInfo(null);

    try {
      const raw = await Promise.race<string | null>([
        SecureStore.getItemAsync("onboarding_bank"),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), BANK_FETCH_TIMEOUT_MS)
        ),
      ]);

      if (!raw) {
        setBankState("empty");
        return;
      }

      const parsed = JSON.parse(raw);
      const bank = parsed?.bank || parsed?.bankName || parsed?.bank_name;
      const accountNumber = parsed?.accountNumber || parsed?.account_number;
      if (!bank || !accountNumber) {
        setBankState("empty");
        return;
      }

      setBankInfo({ bank, accountNumber: String(accountNumber) });
      setBankState("data");
    } catch {
      setBankState("error");
      setBankError("Could not load your bank account right now. Please retry.");
    }
  };

  useEffect(() => {
    (async () => {
      const oStr = await SecureStore.getItemAsync("onboarding_loan_offer");
      const sStr = await SecureStore.getItemAsync("user_loan_selection");
      const eStr = await SecureStore.getItemAsync("onboarding_eligibility_snapshot");

      const next = {
        amount: 0,
        tenorDays: 30,
        installments: 1,
        purpose: "Personal",
        interestRate: 0.035,
        processingFee: 1500,
      };

      let offerAmount: number | null = null;

      if (oStr) {
        const parsedOffer = JSON.parse(oStr);
        setOffer(parsedOffer);
        const candidateOfferAmount = Number(parsedOffer.requestedAmount || parsedOffer.maxLimit || 0);
        if (!Number.isNaN(candidateOfferAmount) && candidateOfferAmount > 0) {
          next.amount = candidateOfferAmount;
          offerAmount = candidateOfferAmount;
        }
        const candidateTenor = Number(parsedOffer.tenorDays || 0);
        if (!Number.isNaN(candidateTenor) && candidateTenor > 0) {
          next.tenorDays = candidateTenor;
        }
        if (typeof parsedOffer.purpose === "string" && parsedOffer.purpose.trim()) {
          next.purpose = parsedOffer.purpose.trim();
        }
      }

      if (sStr) {
        const s = JSON.parse(sStr);
        if (typeof s.amount === "number" && s.amount > 0) next.amount = s.amount;
        if (typeof s.tenorDays === "number" && s.tenorDays > 0) next.tenorDays = s.tenorDays;
        if (typeof s.installments === "number" && s.installments > 0) next.installments = s.installments;
        if (typeof s.purpose === "string" && s.purpose.trim()) next.purpose = s.purpose.trim();

        if (offerAmount && typeof s.amount === "number" && s.amount > 0 && s.amount !== offerAmount) {
          setOfferSyncNote("Offer values were updated to reflect your latest selection.");
        }
      }

      if (eStr) {
        const elig = JSON.parse(eStr);
        const er = Number(elig.interestRate);
        const ef = Number(elig.processingFee);
        if (!Number.isNaN(er) && er > 0) next.interestRate = er;
        if (!Number.isNaN(ef) && ef >= 0) next.processingFee = ef;
      }

      setAmount(next.amount);
      setTenorDays(next.tenorDays);
      setInstallments(next.installments);
      setPurpose(next.purpose);
      setInterestRate(next.interestRate);
      setProcessingFee(next.processingFee);

      await loadBankInfo();

      try {
        const eligibility = await actions.fetchEligibility();
        if (eligibility.interestRate > 0) setInterestRate(eligibility.interestRate);
        setProcessingFee(eligibility.processingFee);
      } catch {
        // keep snapshot/fallback values
      }

      try {
        const backendCheckpoint = await getBackendCheckpoint(8000);
        const kycStatus = await actions.fetchKycStatus();
        if (!kycStatus.canApply && isIdentityKycIncomplete(kycStatus.steps)) {
          setKycBlockMessage("KYC incomplete. Please verify your identity first.");
        } else if (!kycStatus.canApply && isBankStepIncomplete(kycStatus.steps)) {
          setKycBlockMessage("Bank verification incomplete. Please add and verify your bank account.");
        } else {
          setKycBlockMessage("");
        }
      } catch {
        // avoid false KYC block when backend cannot be confirmed
      }

      const inflight = await SecureStore.getItemAsync(ACCEPT_IN_FLIGHT_KEY);
      if (inflight === "true") {
        setLoading(true);
        setAcceptPhase("reconciling");
        try {
          await actions.fetchLoans();
          await actions.fetchDashboard();
          const checkpoint = await getCheckpoint();
          if (checkpoint && isCheckpointAtOrBeyond(checkpoint, "offer_accepted")) {
            await SecureStore.deleteItemAsync(PENDING_APPLICATION_ID_KEY);
            await SecureStore.deleteItemAsync(ACCEPT_IN_FLIGHT_KEY);
            navigation.navigate("DisbursementStatus");
            return;
          }
          await SecureStore.deleteItemAsync(ACCEPT_IN_FLIGHT_KEY);
          setSubmitError("We could not confirm your last acceptance yet. Please tap Retry Accept Offer.");
        } catch {
          setSubmitError("We are still checking your previous acceptance. Reconnect and tap Retry Accept Offer.");
        } finally {
          setLoading(false);
          setAcceptPhase("idle");
        }
      }
    })();
  }, []);

  const days = tenorDays;
  const normalizedMonthlyRate = interestRate > 1 ? interestRate / 100 : interestRate;
  const interest = Math.round(amount * normalizedMonthlyRate * (days / 30));
  const total = amount + interest + processingFee;
  const perInstallment = Math.round(total / installments);
  const monthlyRatePct = `${(normalizedMonthlyRate * 100).toFixed(1)}%`;

  const handleAccept = async () => {
    if (loading) return;

    if (bankState === "loading") {
      setSubmitError("Please wait while we load your bank account details.");
      return;
    }
    if (bankState === "empty") {
      setSubmitError("No linked bank account found. Please add your bank account first.");
      return;
    }
    if (bankState === "error") {
      setSubmitError("Bank account details could not be loaded. Please retry.");
      return;
    }

    if (kycBlockMessage) {
      setSubmitError(kycBlockMessage);
      return;
    }
    if (!amount || amount <= 0 || !tenorDays || tenorDays <= 0) {
      setSubmitError("Please return and reselect your loan amount and duration.");
      return;
    }

    console.info("[review-offer] submit values", {
      amount,
      tenorDays: days,
      installments,
      purpose,
      interestRate,
      processingFee,
    });

    setSubmitError("");
    setLoading(true);
    try {
      let applicationId = await SecureStore.getItemAsync(PENDING_APPLICATION_ID_KEY);

      if (!applicationId) {
        setAcceptPhase("submitting");
        applicationId = await actions.submitApplication({
          amount,
          tenorDays: days,
          purpose,
        });
        await SecureStore.setItemAsync(PENDING_APPLICATION_ID_KEY, applicationId);
      }

      await SecureStore.setItemAsync(ACCEPT_IN_FLIGHT_KEY, "true");
      setAcceptPhase("confirming");
      const acceptance = await actions.acceptOffer(applicationId);

      await SecureStore.deleteItemAsync(PENDING_APPLICATION_ID_KEY);
      await SecureStore.deleteItemAsync(ACCEPT_IN_FLIGHT_KEY);
      const nextCheckpoint = mapBackendWorkflowStatusToCheckpoint(acceptance.applicationStatus) || "offer_accepted";
      await setCheckpoint(nextCheckpoint);
      navigation.navigate("DisbursementStatus");
    } catch (e: any) {
      const message = e?.message || "Failed to accept offer";
      let displayMessage = message;
      try {
        const maybeKyc = String(message).toLowerCase().includes("kyc");
        if (maybeKyc) {
          const kycStatus = await actions.fetchKycStatus();
          if (!isIdentityKycIncomplete(kycStatus.steps)) {
            displayMessage = "Account verification is incomplete. Please confirm your bank account and try again.";
          }
        }
      } catch {
        // Keep original backend message when status check fails.
      }
      setSubmitError(displayMessage);
      const upper = String(message).toUpperCase();
      if (upper.includes("ACTIVE_LOAN_EXISTS") || upper.includes("ALREADY HAVE AN ACTIVE LOAN")) {
        await SecureStore.deleteItemAsync(PENDING_APPLICATION_ID_KEY);
        await SecureStore.deleteItemAsync(ACCEPT_IN_FLIGHT_KEY);
        await setCheckpoint("complete");
        navigation.reset({ index: 0, routes: [{ name: "Main", params: { screen: "Loans" } }] });
      }
    } finally {
      setLoading(false);
      setAcceptPhase("idle");
    }
  };

  const fmt = (n: number) => "N" + n.toLocaleString();

  const bankDisplay =
    bankState === "loading"
      ? "Loading account..."
      : bankState === "empty"
        ? "No linked account"
        : bankState === "error"
          ? "Unable to load account"
          : `${bankInfo.bank} •••• ${String(bankInfo.accountNumber).slice(-4)}`;

  return (
    <View style={styles.container}>
      <View style={[styles.hero, { paddingTop: insets.top + 52 }]}> 
        <View style={styles.logoRow}>
          <View style={styles.logoBox}><Text style={styles.logoText}>NC</Text></View>
          <Text style={styles.logoName}>Monivo</Text>
        </View>
        <Text style={styles.approvedTitle}>Final review of your loan</Text>
        <Text style={styles.amountBig}>{fmt(amount)}</Text>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{monthlyRatePct} / month · {days} Days</Text>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {offerSyncNote ? (
          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerText}>{offerSyncNote}</Text>
          </View>
        ) : null}

        {kycBlockMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Action required</Text>
            <Text style={styles.errorBody}>{kycBlockMessage}</Text>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          {[
            { key: "Loan Amount", val: fmt(amount) },
            { key: "Purpose", val: purpose },
            { key: "Interest Rate", val: monthlyRatePct },
            { key: "Total Interest", val: fmt(interest) },
            { key: "Processing Fee", val: fmt(processingFee) },
            { key: "Total Repayment", val: fmt(total), bold: true },
            { key: "Disburse to", val: bankDisplay, green: bankState === "data" },
          ].map((row, idx, arr) => (
            <View key={row.key} style={[styles.infoRow, idx < arr.length - 1 && styles.infoRowBorder]}>
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

        {bankState === "empty" ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Bank account required</Text>
            <Text style={styles.errorBody}>Please add your bank account before accepting this offer.</Text>
            <Pressable style={styles.inlineActionBtn} onPress={() => navigation.navigate("BankLinking")}>
              <Text style={styles.inlineActionBtnText}>Add Bank Account</Text>
            </Pressable>
          </View>
        ) : null}

        {bankState === "error" ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Bank account unavailable</Text>
            <Text style={styles.errorBody}>{bankError || "Could not load your bank account right now."}</Text>
            <Pressable style={styles.inlineActionBtn} onPress={loadBankInfo}>
              <Text style={styles.inlineActionBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

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

        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerText}>
            By accepting, you confirm you have read and understood all loan terms above.
          </Text>
        </View>

        <View style={styles.btnRow}>
          <Pressable style={styles.ghostBtn} disabled={loading} onPress={() => navigation.navigate("Main")}>
            <Text style={styles.ghostBtnText}>Decline</Text>
          </Pressable>
          <Pressable
            style={[styles.ctaBtn, (loading || bankState !== "data") && styles.ctaBtnDisabled]}
            disabled={loading || bankState !== "data"}
            onPress={handleAccept}
          >
            {loading ? (
              <View style={styles.loadingInline}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.ctaBtnText}>
                  {acceptPhase === "submitting" && "Submitting application..."}
                  {acceptPhase === "confirming" && "Confirming acceptance..."}
                  {acceptPhase === "reconciling" && "Checking previous attempt..."}
                  {acceptPhase === "idle" && "Processing..."}
                </Text>
              </View>
            ) : (
              <Text style={styles.ctaBtnText}>{submitError ? "Retry Accept Offer" : "Accept Offer"}</Text>
            )}
          </Pressable>
        </View>

        {submitError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Acceptance not completed</Text>
            <Text style={styles.errorBody}>{submitError}</Text>
          </View>
        ) : null}
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

  sliderLabel: {
    fontFamily: theme.font.extrabold,
    fontSize: 11,
    color: theme.colors.primary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
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
  ctaBtnDisabled: {
    opacity: 0.6,
  },
  ctaBtnText: { fontFamily: theme.font.bold, fontSize: 14, color: "#FFFFFF" },
  loadingInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  errorCard: {
    backgroundColor: "rgba(255,59,48,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,59,48,0.25)",
    borderRadius: 12,
    padding: 12,
  },
  errorTitle: {
    fontFamily: theme.font.bold,
    color: theme.colors.error,
    fontSize: 13,
    marginBottom: 4,
  },
  errorBody: {
    fontFamily: theme.font.body,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  inlineActionBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineActionBtnText: {
    color: "#FFFFFF",
    fontFamily: theme.font.bold,
    fontSize: 12,
  },

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
});





