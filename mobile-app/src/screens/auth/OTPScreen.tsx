import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRoute, useNavigation, CommonActions, useFocusEffect } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme/theme";
import { useStore } from "../../state/store";
import { getAuthoritativeResumeRoute, setCheckpoint } from "../../lib/onboarding";

const CODE_LENGTH = 6;
const TIMER_SECONDS = 300;

export default function OTPScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { actions } = useStore();

  const phone: string = route.params?.phone || "";
  const channel: string = route.params?.channel || "sms";
  const [debugOtp, setDebugOtp] = useState(() => String(route.params?.debugOtp || ""));

  const [otp, setOtp] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearTimeout(id);
  }, [timeLeft]);

  useFocusEffect(
    React.useCallback(() => {
      let tries = 0;
      const id = setInterval(() => {
        tries += 1;
        inputRef.current?.focus();
        if (tries >= 6) clearInterval(id);
      }, 180);
      return () => clearInterval(id);
    }, [])
  );

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleResend = async () => {
    setTimeLeft(TIMER_SECONDS);
    setError("");
    try {
      const resend = await actions.requestOtp(phone, channel as "sms" | "email" | "whatsapp");
      if (resend.debugOtp) setDebugOtp(resend.debugOtp);
    } catch {
      setError("Network issue while resending code. Please try again.");
    }
  };

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleVerify = async () => {
    if (otp.length < CODE_LENGTH || loading || verifyingRef.current) return;
    setError("");
    verifyingRef.current = true;
    setLoading(true);
    Keyboard.dismiss();

    try {
      const { accessToken, refreshToken, user } = await actions.verifyOtp(phone, otp);
      await actions.completeSignIn({ accessToken, refreshToken, user });
      // OTP succeeded; advance checkpoint before any routing decision.
      await setCheckpoint("otp_verified");

      const isNewUser = (await SecureStore.getItemAsync("auth_is_new_user")) === "true";
      if (isNewUser) {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "KYC" }] }));
      } else {
        const nextRoute = await getAuthoritativeResumeRoute(8000);
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: nextRoute }] }));
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.error?.message ||
        e?.response?.data?.message ||
        e?.message ||
        "Incorrect code. Try again.";
      setError(msg);
      setOtp("");
      triggerShake();
    } finally {
      verifyingRef.current = false;
      setLoading(false);
    }
  };

  const renderBoxes = () =>
    Array.from({ length: CODE_LENGTH }).map((_, i) => {
      const char = otp[i];
      const isFocusedBox =
        focusedIndex === i ||
        (focusedIndex === CODE_LENGTH && i === CODE_LENGTH - 1) ||
        (focusedIndex === -1 && i === otp.length);
      return (
        <View key={i} style={[styles.otpBox, isFocusedBox && styles.otpBoxFocused, !!error && styles.otpBoxError]}>
          <Text style={styles.otpChar}>{char ? "•" : ""}</Text>
        </View>
      );
    });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headline}>Enter Code</Text>
          <Text style={styles.subText}>
            A 6-digit code was sent to <Text style={styles.phoneHighlight}>{phone}</Text> via{" "}
            <Text style={styles.phoneHighlight}>{channel.toUpperCase()}</Text>
          </Text>
          {debugOtp ? <Text style={styles.debugText}>TEST OTP: {debugOtp}</Text> : null}
        </View>
      </View>

      <View style={styles.body}>
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={(val) => {
            const cleaned = val.replace(/\D/g, "").slice(0, CODE_LENGTH);
            setOtp(cleaned);
            setError("");
            setFocusedIndex(cleaned.length);
            if (cleaned.length === CODE_LENGTH) setTimeout(handleVerify, 80);
          }}
          keyboardType="number-pad"
          autoFocus
          style={styles.hiddenInput}
          editable={!loading}
          onFocus={() => setFocusedIndex(otp.length)}
          onBlur={() => setFocusedIndex(-1)}
          caretHidden
        />

        <Pressable onPress={() => inputRef.current?.focus()} style={{ alignItems: "center", justifyContent: "center" }}>
          <Animated.View style={[styles.boxesRow, { transform: [{ translateX: shakeAnim }] }]}>{renderBoxes()}</Animated.View>
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.resendRow}>
          {timeLeft > 0 ? (
            <Text style={styles.timerText}>
              Resend code in <Text style={styles.timerBold}>{formatTime(timeLeft)}</Text>
            </Text>
          ) : (
            <Pressable onPress={handleResend}>
              <Text style={styles.resendText}>Didn't receive it? Resend →</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.changeText}>
          Wrong number? <Text style={styles.changeLink} onPress={() => navigation.goBack()}>Change it</Text>
        </Text>

        <View style={{ flex: 1 }} />

        <Pressable
          style={[styles.ctaBtn, (otp.length < CODE_LENGTH || loading) && styles.ctaBtnDisabled]}
          disabled={otp.length < CODE_LENGTH || loading}
          onPress={handleVerify}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaBtnText}>Verify Code →</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
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
  backArrow: {
    color: "#FFFFFF",
    fontSize: 26,
    lineHeight: 28,
    marginTop: -2,
  },
  headerContent: { marginTop: 64 },
  headline: {
    fontFamily: theme.font.extrabold,
    fontSize: 28,
    color: "#FFFFFF",
    lineHeight: 36,
    marginBottom: 6,
  },
  subText: {
    fontFamily: theme.font.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 20,
  },
  phoneHighlight: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: theme.font.semibold,
  },
  debugText: {
    color: theme.colors.accent,
    fontSize: 13,
    fontFamily: theme.font.bold,
    marginTop: 8,
  },
  body: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 40,
    alignItems: "center",
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
  boxesRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    justifyContent: "center",
    alignSelf: "center",
  },
  otpBox: {
    width: 42,
    height: 54,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  otpBoxFocused: { borderColor: theme.colors.primary },
  otpBoxError: { borderColor: theme.colors.error },
  otpChar: {
    fontFamily: theme.font.extrabold,
    fontSize: 22,
    color: theme.colors.primary,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    fontFamily: theme.font.bodyMedium,
    marginTop: 4,
    textAlign: "center",
  },
  resendRow: { marginTop: 20, marginBottom: 8 },
  timerText: {
    fontFamily: theme.font.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  timerBold: {
    fontFamily: theme.font.semibold,
    color: theme.colors.textPrimary,
  },
  resendText: {
    fontFamily: theme.font.bold,
    fontSize: 13,
    color: theme.colors.primary,
  },
  changeText: {
    fontFamily: theme.font.body,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  changeLink: {
    color: theme.colors.primary,
    fontFamily: theme.font.semibold,
  },
  ctaBtn: {
    backgroundColor: theme.colors.primary,
    width: "100%",
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBtnDisabled: { backgroundColor: "#C8C8D8" },
  ctaBtnText: {
    fontFamily: theme.font.bold,
    fontSize: 15,
    color: "#FFFFFF",
  },
});

