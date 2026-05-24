import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme/theme";

const PIN_LENGTH = 4;

export default function SetPinScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [mode, setMode] = useState<"select" | "pin" | "password">("select");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const handleKeyPress = (key: string) => {
    setError("");
    const currentPin = isConfirming ? confirmPin : pin;
    if (currentPin.length >= PIN_LENGTH) return;

    const nextPin = currentPin + key;
    if (isConfirming) {
      setConfirmPin(nextPin);
      if (nextPin.length === PIN_LENGTH) {
        if (nextPin === pin) {
          handleSavePin(nextPin);
        } else {
          setTimeout(() => {
            setError("PINs do not match. Try again.");
            setConfirmPin("");
            triggerShake();
          }, 300);
        }
      }
    } else {
      setPin(nextPin);
      if (nextPin.length === PIN_LENGTH) {
        setTimeout(() => setIsConfirming(true), 300);
      }
    }
  };

  const handleDelete = () => {
    if (isConfirming) {
      setConfirmPin(confirmPin.slice(0, -1));
    } else {
      setPin(pin.slice(0, -1));
    }
  };

  const handleSavePin = async (finalPin: string) => {
    setLoading(true);
    try {
      // In a real app, you'd send this to the backend
      // For now, we persist it locally and move to KYC
      await SecureStore.setItemAsync("user_pin", finalPin);
      navigation.navigate("KYC");
    } catch (e) {
      setError("Failed to save PIN. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderDots = () => {
    const currentPin = isConfirming ? confirmPin : pin;
    return (
      <View style={styles.dotsRow}>
        {[...Array(PIN_LENGTH)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              currentPin.length > i && styles.dotFilled,
              error ? styles.dotError : null,
            ]}
          />
        ))}
      </View>
    );
  };

  if (mode === "select") {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
        <View style={styles.header}>
          <Text style={styles.headline}>Secure Your Account</Text>
          <Text style={styles.subText}>How would you like to login?</Text>
        </View>

        <View style={styles.selectBody}>
          <Pressable style={styles.optionCard} onPress={() => setMode("pin")}>
            <View style={styles.optionIcon}>
              <Text style={{ fontSize: 24 }}>🔢</Text>
            </View>
            <View>
              <Text style={styles.optionTitle}>4-Digit PIN</Text>
              <Text style={styles.optionDesc}>Fast and secure access</Text>
            </View>
            <Text style={styles.optionArrow}>→</Text>
          </Pressable>

          <Pressable style={styles.optionCard} onPress={() => setMode("password")}>
            <View style={styles.optionIcon}>
              <Text style={{ fontSize: 24 }}>🔑</Text>
            </View>
            <View>
              <Text style={styles.optionTitle}>Password</Text>
              <Text style={styles.optionDesc}>Strong alphanumeric security</Text>
            </View>
            <Text style={styles.optionArrow}>→</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <View style={styles.headerCentered}>
        <Pressable onPress={() => { setMode("select"); setPin(""); setConfirmPin(""); setIsConfirming(false); }} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headlineCentered}>
          {isConfirming ? "Confirm PIN" : "Create PIN"}
        </Text>
        <Text style={styles.subTextCentered}>
          {isConfirming ? "Re-enter your 4-digit PIN" : "Choose a 4-digit PIN for quick access"}
        </Text>
      </View>

      <Animated.View style={[styles.displayArea, { transform: [{ translateX: shakeAnim }] }]}>
        {renderDots()}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </Animated.View>

      <View style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <Pressable key={num} style={styles.key} onPress={() => handleKeyPress(num.toString())}>
            <Text style={styles.keyText}>{num}</Text>
          </Pressable>
        ))}
        <View style={styles.keyEmpty} />
        <Pressable style={styles.key} onPress={() => handleKeyPress("0")}>
          <Text style={styles.keyText}>0</Text>
        </Pressable>
        <Pressable style={styles.key} onPress={handleDelete}>
          <Text style={styles.keyText}>⌫</Text>
        </Pressable>
      </View>

      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, paddingHorizontal: 24 },
  header: { marginBottom: 32 },
  headerCentered: { alignItems: "center", marginBottom: 32, position: "relative" },
  backBtn: { position: "absolute", left: 0, top: 0, width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 32, color: theme.colors.primary },
  headline: { fontFamily: theme.font.extrabold, fontSize: 28, color: theme.colors.primary, marginBottom: 8 },
  headlineCentered: { fontFamily: theme.font.extrabold, fontSize: 24, color: theme.colors.primary, marginBottom: 8, marginTop: 40 },
  subText: { fontFamily: theme.font.body, fontSize: 15, color: theme.colors.textSecondary },
  subTextCentered: { fontFamily: theme.font.body, fontSize: 14, color: theme.colors.textSecondary, textAlign: "center" },
  
  selectBody: { gap: 16 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  optionIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: "#EEEDF8", alignItems: "center", justifyContent: "center", marginRight: 16 },
  optionTitle: { fontFamily: theme.font.bold, fontSize: 16, color: theme.colors.primary, marginBottom: 2 },
  optionDesc: { fontFamily: theme.font.body, fontSize: 12, color: theme.colors.textSecondary },
  optionArrow: { marginLeft: "auto", fontSize: 18, color: theme.colors.primary, opacity: 0.3 },

  displayArea: { alignItems: "center", marginVertical: 40 },
  dotsRow: { flexDirection: "row", gap: 20 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: theme.colors.primary },
  dotFilled: { backgroundColor: theme.colors.primary },
  dotError: { borderColor: theme.colors.error },
  errorText: { fontFamily: theme.font.body, color: theme.colors.error, marginTop: 20, fontSize: 13 },

  keypad: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", width: "100%", gap: 15, paddingBottom: 40 },
  key: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  keyEmpty: { width: 80 },
  keyText: { fontFamily: theme.font.semibold, fontSize: 24, color: theme.colors.primary },

  loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center", zIndex: 10 }
});
