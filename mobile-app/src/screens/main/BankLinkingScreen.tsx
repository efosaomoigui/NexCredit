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
import { useStore } from "../../state/store";
import { setCheckpoint } from "../../lib/onboarding";

const BANKS = [
  "Access Bank", "First Bank", "GTBank", "Opay", "PalmPay",
  "Zenith Bank", "UBA", "Union Bank", "Kuda Bank", "Moniepoint", "Other",
];
const BANK_CODE_MAP: Record<string, string> = {
  "Access Bank": "044",
  "First Bank": "011",
  "GTBank": "058",
  "Zenith Bank": "057",
  "UBA": "033",
  "Union Bank": "032",
  "Kuda Bank": "50211",
  "Moniepoint": "50515",
  "Opay": "999991",
  "PalmPay": "999992",
  "Other": "000",
};

export default function BankLinkingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { actions } = useStore();

  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankVerified, setBankVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [showBanks, setShowBanks] = useState(false);
  const [bankSearch, setBankSearch] = useState("");

  const filteredBanks = BANKS.filter(b => b.toLowerCase().includes(bankSearch.toLowerCase()));

  const isValid = bank && accountNumber.length === 10 && accountName.trim().length > 2 && bankVerified;

  const handleAccountNumberChange = async (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 10);
    setAccountNumber(digits);
    setAccountName("");
    setBankVerified(false);
    setError("");

    if (digits.length === 10 && bank) {
      setVerifying(true);
      try {
        const bankCode = BANK_CODE_MAP[bank] || "000";
        const res = await actions.verifyBankAccount({ bankCode, accountNumber: digits, bankName: bank });
        setAccountName(res.accountName);
        setBankVerified(true);
      } catch (e: any) {
        setError(e?.message || "Bank verification failed. Please confirm your details.");
        setAccountName("");
        setBankVerified(false);
      } finally {
        setVerifying(false);
      }
    }
  };

  const handleConfirm = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    try {
      const payload = { bank, accountNumber, accountName };
      await SecureStore.setItemAsync("onboarding_bank", JSON.stringify(payload));
      await setCheckpoint("bank_match");
      navigation.navigate("ApprovalStatus");
    } catch (e: any) {
      setError(e.message || "Failed to confirm. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Navy Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headline}>Bank account</Text>
          <Text style={styles.subText}>Funds will be sent here if approved.</Text>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Bank Name */}
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>BANK NAME</Text>
          <Pressable style={styles.fieldRow} onPress={() => setShowBanks(!showBanks)}>
            <Text style={[styles.fieldText, !bank && styles.placeholder]}>
              {bank || "Select your bank"}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          {showBanks && (
            <View style={styles.dropdown}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search banks..."
                value={bankSearch}
                onChangeText={setBankSearch}
              />
              <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                {filteredBanks.map((b) => (
                  <Pressable
                    key={b}
                    style={styles.dropdownItem}
                    onPress={() => { setBank(b); setShowBanks(false); setBankSearch(""); handleAccountNumberChange(accountNumber); }}
                  >
                    <Text style={[styles.dropdownText, bank === b && styles.dropdownTextActive]}>{b}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Account Number */}
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>ACCOUNT NUMBER</Text>
          <View style={styles.fieldRow}>
            <TextInput
              style={styles.fieldInput}
              placeholder="10-digit account number"
              placeholderTextColor="#C8C8D8"
              value={accountNumber}
              onChangeText={handleAccountNumberChange}
              keyboardType="number-pad"
              maxLength={10}
            />
            {verifying && <ActivityIndicator size="small" color={theme.colors.primary} />}
            {bankVerified && accountName && !verifying && <Text style={{fontSize: 18, color: theme.colors.success}}>✓</Text>}
          </View>
        </View>

        {/* Auto-filled account name */}
        {bankVerified && accountName ? (
          <View style={styles.accountNameCard}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4}}>
              <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.success}} />
              <Text style={styles.accountNameLabel}>ACCOUNT NAME VERIFIED</Text>
            </View>
            <Text style={styles.accountNameValue}>{accountName}</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.ctaBtn, (!isValid || loading) && styles.ctaBtnDisabled]}
          disabled={!isValid || loading}
          onPress={handleConfirm}
        >
          {loading
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.ctaBtnText}>Add Account →</Text>
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
  bodyContent: { padding: 24, paddingBottom: 40 },
  formGroup: { marginBottom: 18 },
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
    minHeight: 50,
  },
  fieldText: { flex: 1, fontFamily: theme.font.body, fontSize: 14, color: theme.colors.textPrimary },
  fieldInput: { flex: 1, fontFamily: theme.font.body, fontSize: 14, color: theme.colors.textPrimary },
  placeholder: { color: "#C8C8D8" },
  chevron: { fontSize: 18, color: theme.colors.textSecondary },
  dropdown: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 13,
    marginTop: 4,
    maxHeight: 250,
  },
  searchInput: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    padding: 12,
    fontFamily: theme.font.body,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  dropdownList: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownText: { fontFamily: theme.font.body, fontSize: 14, color: theme.colors.textPrimary },
  dropdownTextActive: { color: theme.colors.primary, fontFamily: theme.font.semibold },

  accountNameCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 13,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  accountNameLabel: {
    fontFamily: theme.font.bold,
    fontSize: 10,
    color: theme.colors.primary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  accountNameValue: {
    fontFamily: theme.font.body,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },

  errorText: { color: theme.colors.error, fontSize: 13, fontFamily: theme.font.body, marginBottom: 12 },
  ctaBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  ctaBtnDisabled: { backgroundColor: "#C8C8D8" },
  ctaBtnText: { fontFamily: theme.font.bold, fontSize: 15, color: "#FFFFFF" },
});

