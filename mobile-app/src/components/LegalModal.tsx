import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme/theme";

interface LegalModalProps {
  visible: boolean;
  onClose: () => void;
  type: "terms" | "privacy";
}

export default function LegalModal({ visible, onClose, type }: LegalModalProps) {
  const insets = useSafeAreaInsets();
  const title = type === "terms" ? "Terms & Conditions" : "Privacy Policy";

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
          <Text style={styles.bodyText}>
            {type === "terms" ? (
              <>
                <Text style={styles.sectionTitle}>1. Introduction</Text>
                {"\n"}Welcome to NexCredit. By using our application, you agree to these terms...
                {"\n\n"}
                <Text style={styles.sectionTitle}>2. Loan Eligibility</Text>
                {"\n"}You must be a resident of Nigeria, at least 18 years old, and have a valid BVN...
                {"\n\n"}
                <Text style={styles.sectionTitle}>3. Interest & Fees</Text>
                {"\n"}Interest rates are calculated based on your credit profile. Late payments may attract penalties...
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>1. Data Collection</Text>
                {"\n"}We collect your name, BVN, phone number, and location to provide loan services...
                {"\n\n"}
                <Text style={styles.sectionTitle}>2. Data Security</Text>
                {"\n"}Your data is encrypted and protected under the Nigeria Data Protection Regulation (NDPR)...
                {"\n\n"}
                <Text style={styles.sectionTitle}>3. Third-party Sharing</Text>
                {"\n"}We only share data with credit bureaus and regulatory bodies as required by law...
              </>
            )}
            {"\n\n"}
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: { fontFamily: theme.font.extrabold, fontSize: 18, color: theme.colors.primary },
  closeBtn: { padding: 4 },
  closeText: { fontFamily: theme.font.bold, color: theme.colors.error, fontSize: 14 },
  content: { flex: 1, padding: 20 },
  bodyText: { fontFamily: theme.font.body, fontSize: 14, color: theme.colors.textPrimary, lineHeight: 22 },
  sectionTitle: { fontFamily: theme.font.bold, color: theme.colors.primary },
});
