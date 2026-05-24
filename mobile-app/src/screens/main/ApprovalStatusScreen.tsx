import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { theme } from "../../theme/theme";
import { setCheckpoint } from "../../lib/onboarding";

export default function ApprovalStatusScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [error, setError] = useState("");
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 900, useNativeDriver: true })
    ).start();

    const processLoan = async () => {
      try {
        const intentStr = await SecureStore.getItemAsync("onboarding_loan_intent");
        if (!intentStr) throw new Error("Loan intent missing.");

        const intent = JSON.parse(intentStr);
        const maxLimit = Math.min(intent.amount, 25000);

        const offer = {
          maxLimit,
          requestedAmount: intent.amount,
          tenorDays: intent.tenorDays || 30,
          purpose: intent.purpose || "Personal",
        };

        await SecureStore.setItemAsync("onboarding_loan_offer", JSON.stringify(offer));
        await setCheckpoint("offer_ready");

        setTimeout(() => {
          navigation.navigate("LoanConfiguration");
        }, 900);
      } catch (e: any) {
        setError(e?.message || "Eligibility check failed.");
      }
    };

    processLoan();
  }, [navigation, spinAnim]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}> 
        <View style={styles.logoRow}>
          <View style={styles.logoBox}><Text style={styles.logoText}>NC</Text></View>
          <Text style={styles.logoName}>Monivo</Text>
        </View>
        <Text style={styles.headline}>Checking your details</Text>
        <Text style={styles.subText}>Preparing your loan offer...</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.spinnerWrap}>
          <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => navigation.navigate("LoanConfiguration")}>
              <Text style={styles.retryBtnText}>Continue →</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingBottom: 28,
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
  headline: {
    fontFamily: theme.font.extrabold,
    fontSize: 28,
    color: "#FFFFFF",
    lineHeight: 36,
    marginBottom: 4,
  },
  subText: { fontFamily: theme.font.body, fontSize: 13, color: "rgba(255,255,255,0.5)" },

  body: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerWrap: { alignItems: "center", justifyContent: "center", marginVertical: 12 },
  spinner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 4,
    borderColor: "rgba(30,20,96,0.12)",
    borderTopColor: theme.colors.primary,
  },

  errorCard: {
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    padding: 16,
    borderRadius: 14,
    marginTop: 16,
    width: "100%",
  },
  errorText: {
    color: theme.colors.error,
    fontFamily: theme.font.body,
    fontSize: 14,
    textAlign: "center",
  },
  retryBtn: {
    alignSelf: "center",
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontFamily: theme.font.bold,
    fontSize: 13,
  },
});
