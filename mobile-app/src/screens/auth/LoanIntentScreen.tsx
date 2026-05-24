import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { theme } from "../../theme/theme";
import { setCheckpoint } from "../../lib/onboarding";

export default function LoanIntentScreen() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    (async () => {
      const existing = await SecureStore.getItemAsync("onboarding_loan_intent");
      if (!existing) {
        const payload = { amount: 100000, tenorDays: 30, purpose: "Personal" };
        await SecureStore.setItemAsync("onboarding_loan_intent", JSON.stringify(payload));
      }
      await setCheckpoint("loan_intent");
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "PhoneEntry" }] }));
    })();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.accent} />
      <Text style={styles.text}>Preparing your application...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  text: {
    color: "#FFFFFF",
    fontFamily: theme.font.body,
    fontSize: 14,
  },
});
