import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { CheckCircle2, ArrowRightCircle, Circle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme/theme";
import { getAuthoritativeResumeRoute, getBackendCheckpoint, getCheckpoint, setCheckpoint } from "../../lib/onboarding";

const ALL_STEPS = [
  { id: "otp_pending", label: "Phone verification", screen: "PhoneEntry" },
  { id: "otp_verified", label: "BVN and face check", screen: "KYC" },
  { id: "kyc_bvn_face", label: "Employment details", screen: "ProfileSetup" },
  { id: "employment", label: "Preparing your offer", screen: "ApprovalStatus" },
  { id: "consent", label: "Preparing your offer", screen: "ApprovalStatus" },
  { id: "bank_match", label: "Eligibility", screen: "ApprovalStatus" },
  { id: "offer_ready", label: "Review and accept", screen: "ReviewTerms" },
  { id: "offer_accepted", label: "Disbursement in progress", screen: "DisbursementStatus" },
  { id: "disbursement_status", label: "Disbursement status", screen: "DisbursementStatus" },
  { id: "complete", label: "Dashboard", screen: "Main" },
];

export default function ResumeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [currentStepId, setCurrentStepId] = useState<string>("otp_pending");
  const [currentIndex, setCurrentIndex] = useState<number>(1);

  useEffect(() => {
    (async () => {
      const step = (await getBackendCheckpoint(8000)) || (await getCheckpoint());
      if (step) {
        setCurrentStepId(step);
        const idx = ALL_STEPS.findIndex((s) => s.id === step);
        if (idx !== -1) {
          setCurrentIndex(idx);
        }
      }
    })();
  }, []);

  const handleContinue = () => {
    getAuthoritativeResumeRoute(8000).then((route) => navigation.navigate(route));
  };

  const handleStartOver = async () => {
    await setCheckpoint("loan_intent");
    await SecureStore.deleteItemAsync("onboarding_personal_info");
    await SecureStore.deleteItemAsync("onboarding_employment");
    await SecureStore.deleteItemAsync("onboarding_bank");
    await SecureStore.deleteItemAsync("onboarding_loan_offer");
    await SecureStore.deleteItemAsync("user_loan_selection");
    await SecureStore.deleteItemAsync("onboarding_pending_application_id");
    
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "PhoneEntry" }],
      })
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>NC</Text>
        </View>

        <Text style={styles.headline}>Welcome back!</Text>
        <Text style={styles.subText}>
          You were in the middle of setting up your account. Want to continue where you left off?
        </Text>

        <View style={styles.stepsContainer}>
          {ALL_STEPS.map((step, idx) => {
            let status = "pending";
            if (idx < currentIndex) status = "completed";
            else if (idx === currentIndex) status = "current";

            return (
              <View key={step.id} style={styles.stepRow}>
                <View style={styles.iconCol}>
                  {status === "completed" && <CheckCircle2 color={theme.colors.success} size={24} />}
                  {status === "current" && <ArrowRightCircle color={theme.colors.accent} size={24} />}
                  {status === "pending" && <Circle color={theme.colors.border} size={24} />}
                  
                  {/* Vertical Line Connector */}
                  {idx < ALL_STEPS.length - 1 && (
                    <View style={[styles.connector, status === "completed" && styles.connectorActive]} />
                  )}
                </View>
                
                <Text style={[
                  styles.stepLabel, 
                  status === "current" && styles.stepLabelCurrent,
                  status === "completed" && styles.stepLabelCompleted
                ]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.spacer} />

        <Pressable style={styles.primaryBtn} onPress={handleContinue}>
          <Text style={styles.primaryBtnText}>Continue my application →</Text>
        </Pressable>

        <Pressable style={styles.startOverBtn} onPress={handleStartOver}>
          <Text style={styles.startOverText}>Start over instead</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.screenPadding,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logoText: {
    color: theme.colors.accent,
    fontSize: 20,
    fontFamily: theme.font.bold,
  },
  headline: {
    fontFamily: theme.font.extrabold,
    fontSize: 26,
    color: theme.colors.textPrimary,
    lineHeight: 32,
    marginBottom: 8,
  },
  subText: {
    fontFamily: theme.font.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 21,
    marginBottom: 32,
  },
  stepsContainer: {
    paddingLeft: 8,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconCol: {
    alignItems: "center",
    width: 24,
    marginRight: 16,
  },
  connector: {
    width: 2,
    height: 32,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  connectorActive: {
    backgroundColor: theme.colors.success,
  },
  stepLabel: {
    fontFamily: theme.font.body,
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  stepLabelCurrent: {
    fontFamily: theme.font.bold,
    color: theme.colors.primary,
  },
  stepLabelCompleted: {
    fontFamily: theme.font.bold,
    color: theme.colors.success,
  },
  spacer: {
    flex: 1,
    minHeight: 40,
  },
  primaryBtn: {
    backgroundColor: theme.colors.accent,
    width: "100%",
    height: theme.spacing.buttonHeight,
    borderRadius: theme.spacing.buttonRadius,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  primaryBtnText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontFamily: theme.font.bold,
  },
  startOverBtn: {
    alignItems: "center",
    padding: 12,
  },
  startOverText: {
    fontFamily: theme.font.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textDecorationLine: "underline",
  },
});

