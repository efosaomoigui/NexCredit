import React, { useState } from "react";
import {
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Contacts from "expo-contacts";
import * as Location from "expo-location";
import { theme } from "../../theme/theme";
import { setCheckpoint } from "../../lib/onboarding";

const PERMISSIONS = [
  "Allow access to contacts",
  "Allow access to location",
  "Allow access to messages",
];

export default function OnboardingConsentScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [checked, setChecked] = useState([false, false, Platform.OS !== "android"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allChecked = checked.every(Boolean);

  const requestPermission = async (idx: number) => {
    try {
      let granted = false;

      if (idx === 0) {
        const res = await Contacts.requestPermissionsAsync();
        granted = res.status === "granted";
      } else if (idx === 1) {
        const res = await Location.requestForegroundPermissionsAsync();
        granted = res.status === "granted";
      } else {
        if (Platform.OS === "android") {
          const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS);
          granted = res === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          granted = true;
        }
      }

      setChecked((prev) => {
        const next = [...prev];
        next[idx] = granted;
        return next;
      });

      if (!granted) {
        setError("Please grant all required permissions to continue.");
      } else {
        setError("");
      }
    } catch {
      setError("Permission request failed. Please try again.");
    }
  };

  const handleContinue = async () => {
    if (!allChecked) return;
    setLoading(true);
    setError("");

    try {
      await setCheckpoint("consent");
      navigation.navigate("BankLinking");
    } catch {
      navigation.navigate("BankLinking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}> 
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headline}>Grant Permission</Text>
          <Text style={styles.subText}>Please grant device permissions to proceed.</Text>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.consentCard}>
          {PERMISSIONS.map((text, idx) => (
            <Pressable
              key={idx}
              style={[styles.consentRow, idx < PERMISSIONS.length - 1 && styles.consentRowBorder]}
              onPress={() => requestPermission(idx)}
            >
              <View style={[styles.checkbox, checked[idx] && styles.checkboxChecked]}>
                {checked[idx] && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.consentText}>{text}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.ndprCard}>
          <Text style={styles.ndprText}>
            These permissions are used only for onboarding and fraud-control checks.
          </Text>
        </View>

        <Pressable
          style={[styles.ctaBtn, (!allChecked || loading) && styles.ctaBtnDisabled]}
          disabled={!allChecked || loading}
          onPress={handleContinue}
        >
          <Text style={styles.ctaBtnText}>{loading ? "Verifying..." : "Continue →"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
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
  body: { flex: 1 },
  bodyContent: { padding: 24, gap: 14, paddingBottom: 40 },

  consentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
  },
  consentRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: theme.font.bold,
  },
  consentText: {
    flex: 1,
    fontFamily: theme.font.body,
    fontSize: 13,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },

  ndprCard: {
    backgroundColor: "rgba(245,166,35,0.08)",
    borderRadius: 13,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.2)",
  },
  ndprText: {
    fontFamily: theme.font.body,
    fontSize: 12,
    color: "#9a6a00",
    lineHeight: 19,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    fontFamily: theme.font.body,
    marginBottom: 10,
    textAlign: "center",
  },

  ctaBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBtnDisabled: { backgroundColor: "#C8C8D8" },
  ctaBtnText: { fontFamily: theme.font.bold, fontSize: 15, color: "#FFFFFF" },
});
