import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MoveRight } from "lucide-react-native";
import { useStore } from "../../state/store";
import { theme } from "../../theme/theme";
import LegalModal from "../../components/LegalModal";
import { setCheckpoint } from "../../lib/onboarding";

type Channel = "sms" | "whatsapp";

export default function PhoneEntryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { actions } = useStore();

  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<Channel>("sms");
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [legalType, setLegalType] = useState<"terms" | "privacy" | null>(null);

  const digits = phone.replace(/\D/g, "");
  const isValid =
    (digits.length === 11 && digits.startsWith("0")) ||
    (digits.length === 10 && !digits.startsWith("0"));

  const handleContinue = async () => {
    if (!isValid || loading) return;
    setError("");
    setLoading(true);
    try {
      const cleanedPhone = `+234${digits.slice(-10)}`;
      const otpResult = await actions.requestOtp(cleanedPhone, channel);
      const identifier = otpResult.normalizedIdentifier || cleanedPhone;

      await setCheckpoint("otp_pending");
      await SecureStore.setItemAsync("auth_is_new_user", otpResult.isNewUser ? "true" : "false");
      await SecureStore.setItemAsync("user_phone", identifier);

      navigation.navigate("OTP", {
        phone: identifier,
        channel,
        debugOtp: otpResult.debugOtp,
      });
    } catch (e: any) {
      setError(e?.message || "Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const CHANNELS: { key: Channel; label: string; icon: string }[] = [
    { key: "sms", label: "SMS", icon: "" },
    { key: "whatsapp", label: "WhatsApp", icon: "" },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>NC</Text>
          </View>
          <Text style={styles.logoName}>Monivo</Text>
        </View>
        <Text style={styles.headline}>What's your{"\n"}phone number?</Text>
        <Text style={styles.subText}>
          We'll send a one-time code to verify it's you. Your number is kept private.
        </Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
          <View style={[styles.fieldRow, isFocused && styles.fieldRowFocused, error ? styles.fieldRowError : null]}>
            <View style={styles.prefixBox}>
              <Text style={styles.prefixText}>NG +234</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="800 000 0000"
              placeholderTextColor="#C8C8D8"
              keyboardType="number-pad"
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                setError("");
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              maxLength={11}
            />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>SEND CODE VIA</Text>
          <View style={styles.channelRow}>
            {CHANNELS.map((ch) => (
              <Pressable
                key={ch.key}
                onPress={() => setChannel(ch.key)}
                style={[styles.channelPill, channel === ch.key && styles.channelPillActive]}
              >
                <Text style={[styles.channelPillText, channel === ch.key && styles.channelPillTextActive]}>
                  {ch.icon ? `${ch.icon} ` : ""}{ch.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.privacyCard}>
          <Text style={styles.privacyIcon}>Lock</Text>
          <Text style={styles.privacyText}>
            We will never share your number or contact anyone on your behalf without permission.
          </Text>
        </View>

        <Text style={styles.termsText}>
          By continuing you agree to our <Text style={styles.termsLink} onPress={() => setLegalType("terms")}>Terms</Text> &{" "}
          <Text style={styles.termsLink} onPress={() => setLegalType("privacy")}>Privacy Policy</Text>.
        </Text>

        <Pressable
          style={[styles.ctaBtn, (!isValid || loading) && styles.ctaBtnDisabled]}
          disabled={!isValid || loading}
          onPress={handleContinue}
        >
          {loading ? (
            <ActivityIndicator color="#1E1460" />
          ) : (
            <View style={styles.ctaInline}>
              <Text style={styles.ctaBtnText}>Continue</Text>
              <MoveRight size={18} color="#FFFFFF" strokeWidth={1.9} />
            </View>
          )}
        </Pressable>
      </ScrollView>

      <LegalModal visible={!!legalType} type={legalType || "terms"} onClose={() => setLegalType(null)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 28,
  },
  logoBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: theme.colors.accent,
    fontFamily: theme.font.extrabold,
    fontSize: 11,
  },
  logoName: {
    fontFamily: theme.font.bold,
    fontSize: 13,
    color: "#FFFFFF",
  },
  headline: {
    fontFamily: theme.font.extrabold,
    fontSize: 28,
    color: "#FFFFFF",
    lineHeight: 36,
    marginBottom: 8,
  },
  subText: {
    fontFamily: theme.font.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 21,
  },
  body: { flex: 1, backgroundColor: "#FFFFFF" },
  bodyContent: {
    padding: 24,
    gap: 0,
    paddingBottom: 40,
  },
  formGroup: { marginBottom: 20 },
  fieldLabel: {
    fontFamily: theme.font.bold,
    fontSize: 10,
    color: theme.colors.primary,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  fieldRowFocused: { borderColor: theme.colors.primary },
  fieldRowError: { borderColor: theme.colors.error },
  prefixBox: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 1.5,
    borderRightColor: theme.colors.border,
    backgroundColor: "#F4F4FA",
  },
  prefixText: {
    fontFamily: theme.font.bold,
    fontSize: 14,
    color: theme.colors.primary,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: theme.font.bodyMedium,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    fontFamily: theme.font.body,
    marginTop: 6,
  },
  channelRow: { flexDirection: "row", gap: 8 },
  channelPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  channelPillActive: {
    borderColor: theme.colors.primary,
    backgroundColor: "#EEEDF8",
  },
  channelPillText: {
    fontFamily: theme.font.bodyMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  channelPillTextActive: {
    color: theme.colors.primary,
    fontFamily: theme.font.bold,
  },
  privacyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F4F4FA",
    borderRadius: 13,
    padding: 14,
    marginBottom: 16,
    marginTop: 4,
  },
  privacyIcon: { fontSize: 12, marginTop: 3, color: theme.colors.primary, fontFamily: theme.font.bold },
  privacyText: {
    flex: 1,
    fontFamily: theme.font.body,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
  termsText: {
    fontFamily: theme.font.body,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  termsLink: {
    color: theme.colors.primary,
    fontFamily: theme.font.semibold,
  },
  ctaBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBtnDisabled: { backgroundColor: "#C8C8D8" },
  ctaBtnText: {
    fontFamily: theme.font.bold,
    fontSize: 15,
    lineHeight: 18,
    color: "#FFFFFF",
  },
  ctaInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 1,
  },
});



