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
import { theme } from "../../theme/theme";
import api from "../../lib/api";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useStore } from "../../state/store";
import { setCheckpoint } from "../../lib/onboarding";

export default function KYCScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { actions } = useStore();

  const [step, setStep] = useState<"bvn" | "selfie">("bvn");
  const [bvn, setBvn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [selfieHint, setSelfieHint] = useState("Bring your face into the circle");
  const isValid = bvn.length === 11;
  const handleBack = () => {
    if (loading) return;
    if (step === "selfie") {
      setStep("bvn");
      setError("");
      return;
    }
    navigation.goBack();
  };

  const handleVerify = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    setError("");
    try {
      let success = false;
      try {
        const res = await api.post("/identity/kyc/bvn-verify", { bvn }, { timeout: 3000 });
        if (res.data.success) {
          const fullName = res.data.data?.profile?.full_name;
          if (typeof fullName === "string" && fullName.trim().length > 0) {
            await SecureStore.setItemAsync("onboarding_personal_info", JSON.stringify({ fullName }));
          }
          success = true;
        } else {
          const code = res.data.error?.code;
          if (code === "NAME_MISMATCH") throw new Error("The name on your BVN doesn't match.");
          if (code === "NOT_FOUND") throw new Error("Could not verify this BVN. Please check it.");
          throw new Error("Something went wrong. Please try again.");
        }
      } catch (e) {
        console.warn("BVN verification failed", e);
        throw new Error("BVN verification could not be confirmed by server. Please check connection and retry.");
      }

      if (!success) return;
      
      // Move to selfie step
      if (!permission?.granted) {
        const p = await requestPermission();
        if (!p.granted) throw new Error("Camera permission is required for verification.");
      }
      setStep("selfie");
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef || loading) return;
    setLoading(true);
    setError("");
    setSelfieHint("Detecting your face...");
    try {
      const photo = await cameraRef.takePictureAsync({ base64: false });
      if (!photo) throw new Error("Failed to capture image.");
      const tooSmall = Number((photo as any).width || 0) < 700 || Number((photo as any).height || 0) < 700;
      if (tooSmall) {
        setSelfieHint("Move forward and center your face in the circle");
        throw new Error("Face is not clear yet. Move closer and try again.");
      }
      
      // Create FormData
      const formData = new FormData();
      formData.append("file", {
        uri: photo.uri,
        name: "selfie.jpg",
        type: "image/jpeg",
      } as any);

      let selfieSuccess = false;
      try {
        const res = await api.post("/identity/kyc/selfie", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 5000,
        });
        if (res.data.success) selfieSuccess = true;
      } catch (e) {
        console.warn("Selfie verification failed", e);
        throw new Error("Selfie verification could not be confirmed by server. Please retry.");
      }

      if (!selfieSuccess) throw new Error("Face verification failed.");

      await setCheckpoint("kyc_bvn_face");
      navigation.navigate("ProfileSetup");
    } catch (e: any) {
      setError(e.message || "Something went wrong capturing your selfie.");
      setSelfieHint("Move forward and center your face in the circle");
    } finally {
      setLoading(false);
    }
  };

  if (step === "selfie" && permission?.granted) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Pressable onPress={handleBack} style={styles.backBtn} disabled={loading}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.headline}>Take a Selfie</Text>
            <Text style={styles.subText}>Position your face in the frame.</Text>
          </View>
        </View>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <CameraView 
            style={{ flex: 1 }} 
            facing="front"
            ref={(ref) => setCameraRef(ref)}
          />
          <View style={styles.cameraOverlay} pointerEvents="none">
            <View style={styles.maskTop} />
            <View style={styles.maskMiddle}>
              <View style={styles.maskSide} />
              <View style={styles.faceGuide} />
              <View style={styles.maskSide} />
            </View>
            <View style={styles.maskBottom} />
            <View style={styles.hintWrap}>
              <Text style={styles.cameraHelpText}>{selfieHint}</Text>
            </View>
          </View>
        </View>
        <View style={{ padding: 24, backgroundColor: "#000", paddingBottom: insets.bottom + 20 }}>
          {error ? <Text style={styles.errorTextDark}>{error}</Text> : null}
          <Pressable
            style={[styles.ctaBtn, loading && styles.ctaBtnDisabled]}
            disabled={loading}
            onPress={handleCapture}
          >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaBtnText}>Capture</Text>}
        </Pressable>
      </View>
    </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Navy Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={handleBack} style={styles.backBtn} disabled={loading}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headline}>Identity Verification</Text>
          <Text style={styles.subText}>Securely confirm your BVN and identity.</Text>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconBox}>
            <Text style={{ fontSize: 18 }}>Lock</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoCardTitle}>Why do we need your BVN?</Text>
            <Text style={styles.infoCardText}>
              We use your BVN to confirm your identity securely, prevent fraud, and process your loan application faster.
            </Text>
          </View>
        </View>

        {/* BVN field */}
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>BVN NUMBER</Text>
          <View style={[styles.fieldRow, isValid && styles.fieldRowValid, !!error && styles.fieldRowError]}>
            {/* Lock icon */}
            <View style={styles.fieldIcon}>
              <Text style={{ fontSize: 14, opacity: 0.35 }}>Lock</Text>
            </View>
            <TextInput
              style={styles.fieldInput}
              placeholder="Enter your 11-digit BVN"
              placeholderTextColor="#C8C8D8"
              value={bvn}
              onChangeText={(val) => { setBvn(val.replace(/\D/g, "").slice(0, 11)); setError(""); }}
              keyboardType="number-pad"
              maxLength={11}
            />
          </View>
          <Text style={styles.hintText}>Dial *565*0# to find your BVN</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <Pressable
          style={[styles.ctaBtn, (!isValid || loading) && styles.ctaBtnDisabled]}
          disabled={!isValid || loading}
          onPress={handleVerify}
        >
          {loading
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.ctaBtnText}>Verify BVN →</Text>
          }
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
  body: { flex: 1 },
  bodyContent: { padding: 24, paddingBottom: 40, gap: 0 },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 22,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(245,166,35,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoCardTitle: {
    fontFamily: theme.font.bold,
    fontSize: 12,
    color: theme.colors.primary,
    marginBottom: 4,
  },
  infoCardText: {
    fontFamily: theme.font.body,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },

  formGroup: { marginBottom: 24 },
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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  fieldRowValid: { borderColor: theme.colors.primary },
  fieldRowError: { borderColor: theme.colors.error },
  fieldIcon: { marginRight: 8 },
  fieldInput: {
    flex: 1,
    fontFamily: theme.font.body,
    fontSize: 18,
    color: theme.colors.textPrimary,
    letterSpacing: 2,
  },
  hintText: {
    fontFamily: theme.font.body,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    fontFamily: theme.font.body,
    marginTop: 6,
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
  
  // Camera specific
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
  },
  maskTop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  maskMiddle: {
    height: 350,
    flexDirection: "row",
  },
  maskSide: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  faceGuide: {
    width: 250,
    height: 350,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderRadius: 125,
    backgroundColor: "transparent",
  },
  maskBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  hintWrap: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 40,
    alignItems: "center",
  },
  cameraHelpText: {
    fontFamily: theme.font.bold,
    fontSize: 14,
    color: "#FFFFFF",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  errorTextDark: {
    color: theme.colors.error,
    fontSize: 13,
    fontFamily: theme.font.body,
    marginBottom: 12,
    textAlign: "center"
  }
});

