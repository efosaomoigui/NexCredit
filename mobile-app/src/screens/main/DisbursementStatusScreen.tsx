import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { theme } from "../../theme/theme";
import { setCheckpoint } from "../../lib/onboarding";

export default function DisbursementStatusScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [offer, setOffer] = React.useState<any>(null);
  const [bank, setBank] = React.useState<any>(null);
  const [selection, setSelection] = React.useState<any>(null);

  React.useEffect(() => {
    (async () => {
      const oStr = await SecureStore.getItemAsync("onboarding_loan_offer");
      const bStr = await SecureStore.getItemAsync("onboarding_bank");
      const sStr = await SecureStore.getItemAsync("user_loan_selection");
      if (oStr) setOffer(JSON.parse(oStr));
      if (bStr) setBank(JSON.parse(bStr));
      if (sStr) setSelection(JSON.parse(sStr));
    })();
  }, []);

  const selAmount = selection?.amount || offer?.maxLimit || 0;
  const selDays = selection?.tenorDays || 30;
  const selStages = selection?.installments || 1;

  const monthlyRate = 0.035;
  const interest = Math.round(selAmount * monthlyRate * (selDays / 30));
  const processingFee = 1500;
  const totalRepayment = selAmount + interest + processingFee;
  const firstStageAmount = Math.round(totalRepayment / selStages);

  const stageDays = Math.round(selDays / selStages);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + stageDays);
  const dateStr = dueDate.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

  const fmt = (n: number) => "₦" + n.toLocaleString();

  return (
    <View style={styles.container}>
      {/* Navy success hero */}
      <View style={[styles.hero, { paddingTop: insets.top + 40 }]}>
        {/* Orbs */}
        <View style={styles.orbTopRight} />
        <View style={styles.orbBottomLeft} />

        {/* Green checkmark circle */}
        <View style={styles.successCircle}>
          <Text style={styles.checkIcon}>✓</Text>
        </View>

        <Text style={styles.moneyLabel}>MONEY SENT!</Text>
        <Text style={styles.amount}>{fmt(selAmount)}</Text>
        <Text style={styles.destination}>
          Sent to {bank?.bank || "Your Bank"} •••• {bank?.accountNumber?.slice(-4) || "0000"}
        </Text>
        <Text style={styles.arrivalNote}>Arrives within minutes</Text>
      </View>

      {/* White bottom card */}
      <View style={styles.bottomCard}>
        <ScrollView contentContainerStyle={styles.bottomContent}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Next Due Date</Text>
              <Text style={styles.infoVal}>{dateStr}</Text>
            </View>
            <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
              <Text style={styles.infoKey}>{selStages > 1 ? "First Stage Payment" : "Total Repayment"}</Text>
              <Text style={[styles.infoVal, { color: theme.colors.accent, fontSize: 16 }]}>{fmt(firstStageAmount)}</Text>
            </View>
          </View>

          <Pressable
            style={styles.ctaBtn}
            onPress={async () => {
              await setCheckpoint("complete");
              navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Main" }] }));
            }}
          >
            <Text style={styles.ctaBtnText}>Go to Dashboard →</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },

  hero: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    position: "relative",
    overflow: "hidden",
    paddingHorizontal: 24,
  },
  orbTopRight: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -100,
    right: -80,
    backgroundColor: "rgba(245,166,35,0.05)",
  },
  orbBottomLeft: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: -50,
    left: -60,
    backgroundColor: "rgba(34,197,94,0.05)",
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(34,197,94,0.15)",
    borderWidth: 2,
    borderColor: theme.colors.success,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  checkIcon: {
    color: theme.colors.success,
    fontSize: 42,
    fontFamily: theme.font.extrabold,
    lineHeight: 48,
  },
  moneyLabel: {
    fontFamily: theme.font.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    letterSpacing: 1,
    zIndex: 1,
  },
  amount: {
    fontFamily: theme.font.extrabold,
    fontSize: 38,
    color: theme.colors.accent,
    zIndex: 1,
  },
  destination: {
    fontFamily: theme.font.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    zIndex: 1,
  },
  arrivalNote: {
    fontFamily: theme.font.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    zIndex: 1,
  },

  bottomCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  bottomContent: {
    padding: 24,
    gap: 14,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: theme.colors.bg,
    borderRadius: 16,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
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

  ctaBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 16,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBtnText: {
    fontFamily: theme.font.bold,
    fontSize: 15,
    color: theme.colors.primary,
  },
});
