import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MoveRight } from "lucide-react-native";
import * as Contacts from "expo-contacts";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { theme } from "../../theme/theme";
import { useStore } from "../../state/store";
import { setCheckpoint } from "../../lib/onboarding";

const EMP_TYPES = ["Salaried", "Business Owner", "Trader/Farmer", "Mixed Income"];
const INCOME_RANGES = ["< NGN 50k", "NGN 50k - NGN 150k", "NGN 150k - NGN 300k", "> NGN 300k"];
const NIGERIAN_STATES = ["Lagos", "Abuja (FCT)", "Rivers", "Oyo", "Kano", "Ogun", "Delta", "Anambra", "Edo", "Kaduna"];
const NOK_RELATIONSHIPS = ["Spouse", "Parent", "Sibling", "Friend", "Other"];

const MOCK_ADDRESSES = [
  "123 Ikorodu Road, Obanikoro, Lagos",
  "45 Lekki Phase 1, Admiralty Way, Lagos",
  "12 Garki Area 11, Abuja",
  "88 Trans Amadi Layout, Port Harcourt",
  "102 Ring Road, Ibadan, Oyo",
  "77 Allen Avenue, Ikeja, Lagos",
];

function normalizeAddressText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatReverseGeocodeAddress(parts: Location.LocationGeocodedAddress): string {
  return [parts.name, parts.street, parts.district, parts.city || parts.subregion, parts.region]
    .filter(Boolean)
    .join(", ");
}

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { state, actions } = useStore();

  const [address, setAddress] = useState("");
  const [stateName, setStateName] = useState("");
  const [empType, setEmpType] = useState("");
  const [income, setIncome] = useState("");
  const [employer, setEmployer] = useState("");

  const [nok1, setNok1] = useState<{ firstName: string; lastName: string; phone: string; relationship: string } | null>(null);
  const [nok2, setNok2] = useState<{ firstName: string; lastName: string; phone: string; relationship: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [locationHints, setLocationHints] = useState<string[]>([]);
  const [locationVerified, setLocationVerified] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const location = await Location.requestForegroundPermissionsAsync();
        if (location.status !== "granted") {
          setError("Location access is required to continue onboarding.");
          setLocationVerified(false);
          return;
        }

        const pos = await Location.getCurrentPositionAsync({});
        const reverse = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        const primary = reverse[0];
        const country = String(primary?.country || "").toLowerCase();
        const iso = String(primary?.isoCountryCode || "").toUpperCase();
        const hints = reverse.map(formatReverseGeocodeAddress).filter(Boolean);
        setLocationHints([...new Set(hints)]);

        const inNigeria = country.includes("nigeria") || iso === "NG";
        if (!inNigeria) {
          setError("We currently support onboarding only within Nigeria.");
          setLocationVerified(false);
          return;
        }

        setError("");
        setLocationVerified(true);
      } catch {
        setError("Unable to confirm your location. Please retry.");
        setLocationVerified(false);
      }
    })();
  }, []);
  const handleAddressChange = (text: string) => {
    setAddress(text);
    const query = normalizeAddressText(text);
    if (query.length >= 3) {
      const basePool = [...locationHints, ...MOCK_ADDRESSES];
      const tokens = query.split(" ").filter(Boolean);
      const filtered = basePool.filter((candidate) => {
        const normalizedCandidate = normalizeAddressText(candidate);
        return tokens.every((token) => normalizedCandidate.includes(token));
      });
      if (!filtered.some((s) => normalizeAddressText(s) === query)) filtered.unshift(text);
      setAddressSuggestions(filtered);
    } else {
      setAddressSuggestions([]);
    }
  };

  const handlePickContact = async (setter: (val: any) => void) => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        setError("Contacts permission is required to pick Next of Kin.");
        return;
      }
      const contact = await Contacts.presentContactPickerAsync();
      if (contact) {
        const nameParts = (contact.name || "").split(" ");
        const firstName = nameParts[0] || "Unknown";
        const lastName = nameParts.slice(1).join(" ") || "Contact";
        const phone = contact.phoneNumbers && contact.phoneNumbers.length > 0 ? contact.phoneNumbers[0].number : "";
        setter({ firstName, lastName, phone, relationship: "" });
      }
    } catch {
      setError("Could not pick contact. Please enter manually.");
    }
  };

  const handleSubmit = async () => {
    if (!address || !stateName || !empType || !income || !nok1 || !nok2) {
      setError("Please fill all required fields, including both Next of Kins.");
      return;
    }
    if (!nok1.firstName || !nok1.lastName || !nok2.firstName || !nok2.lastName) {
      setError("Please provide first and last names for both contacts.");
      return;
    }
    if (!nok1.relationship || !nok2.relationship) {
      setError("Please select a relationship for both Next of Kins.");
      return;
    }
    if (!locationVerified) {
      setError("Please allow location and confirm you are in Nigeria to continue.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const personalInfoRaw = await SecureStore.getItemAsync("onboarding_personal_info");
      const personalInfoName = personalInfoRaw
        ? String(JSON.parse(personalInfoRaw)?.fullName || "").trim()
        : "";
      const storeName = String(state.borrower?.fullName || "").trim();
      const fullName = personalInfoName || storeName;
      if (!fullName || fullName.toLowerCase() === "guest") {
        throw new Error("Borrower identity is missing. Please complete BVN verification and try again.");
      }
      await actions.updatePersonalInfo({
        fullName,
        dob: "1990-01-01",
        gender: "Male",
        address: `${address}, ${stateName}`,
        marital: "Single",
        nextOfKin: [nok1, nok2],
      });

      await actions.updateEmploymentInfo({
        empType,
        employer,
        income,
        salaryDate: "2026-05-30",
      });

      await new Promise<void>((resolve) => {
        Alert.alert(
          "Allow contact access",
          "This helps us process your loan request and verify your next-of-kin details.",
          [{ text: "Accept", onPress: () => resolve() }],
          { cancelable: false }
        );
      });

      const contactsCurrent = await Contacts.getPermissionsAsync();
      const contacts =
        contactsCurrent.status === "granted"
          ? contactsCurrent
          : await Contacts.requestPermissionsAsync();
      if (contacts.status !== "granted") {
        throw new Error("Contacts permission is required to continue.");
      }

      await setCheckpoint("consent");
      navigation.navigate("BankLinking");
    } catch (e: any) {
      setError(e?.message || "Failed to save information. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}> 
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headline}>Profile Setup</Text>
          <Text style={styles.subText}>Tell me a bit more about you.</Text>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.sectionTitle}>Where do you live?</Text>
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>RESIDENTIAL ADDRESS</Text>
          <TextInput style={styles.input} value={address} onChangeText={handleAddressChange} placeholder="Start typing your address..." />
          {addressSuggestions.length > 0 && (
            <View style={styles.suggestions}>
              {addressSuggestions.map((s) => (
                <Pressable key={s} style={styles.suggestionItem} onPress={() => { setAddress(s); setAddressSuggestions([]); }}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>STATE OF RESIDENCE</Text>
          <Pressable style={styles.pickerTrigger} onPress={() => setShowStatePicker(!showStatePicker)}>
            <Text style={stateName ? styles.pickerValue : styles.pickerPlaceholder}>{stateName || "Select State"}</Text>
            <Text style={styles.pickerArrow}>v</Text>
          </Pressable>
          {showStatePicker && (
            <View style={styles.dropdown}>
              {NIGERIAN_STATES.map((s) => (
                <Pressable key={s} style={styles.dropdownItem} onPress={() => { setStateName(s); setShowStatePicker(false); }}>
                  <Text style={styles.dropdownText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Employment Details</Text>
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>EMPLOYMENT TYPE</Text>
          <View style={styles.chipsRow}>
            {EMP_TYPES.map((e) => (
              <Pressable key={e} style={[styles.chip, empType === e && styles.chipActive]} onPress={() => setEmpType(e)}>
                <Text style={[styles.chipText, empType === e && styles.chipTextActive]}>{e}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>MONTHLY INCOME RANGE</Text>
          <View style={styles.chipsRow}>
            {INCOME_RANGES.map((inc) => (
              <Pressable key={inc} style={[styles.chip, income === inc && styles.chipActive]} onPress={() => setIncome(inc)}>
                <Text style={[styles.chipText, income === inc && styles.chipTextActive]}>{inc}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>EMPLOYER / BUSINESS NAME (Optional)</Text>
          <TextInput style={styles.input} value={employer} onChangeText={setEmployer} placeholder="e.g. Employer Name" />
        </View>

        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        <Text style={styles.hintText}>Please provide two close contacts.</Text>

        <View style={styles.nokCard}>
          <Text style={styles.nokTitle}>Next of Kin 1</Text>
          <View style={styles.rowInputs}>
            <TextInput style={[styles.input, styles.rowInputItem]} placeholder="First Name" value={nok1?.firstName || ""} onChangeText={(f) => setNok1((prev) => ({ ...prev, firstName: f, phone: prev?.phone || "", lastName: prev?.lastName || "", relationship: prev?.relationship || "" }))} />
            <TextInput style={[styles.input, styles.rowInputItem]} placeholder="Last Name" value={nok1?.lastName || ""} onChangeText={(l) => setNok1((prev) => ({ ...prev, lastName: l, phone: prev?.phone || "", firstName: prev?.firstName || "", relationship: prev?.relationship || "" }))} />
          </View>
          <TextInput style={styles.input} placeholder="Phone Number" value={nok1?.phone || ""} onChangeText={(p) => setNok1((prev) => ({ ...prev, phone: p, firstName: prev?.firstName || "", lastName: prev?.lastName || "", relationship: prev?.relationship || "" }))} keyboardType="phone-pad" />
          <Text style={styles.fieldLabel}>RELATIONSHIP</Text>
          <View style={styles.chipsRow}>
            {NOK_RELATIONSHIPS.map((rel) => (
              <Pressable key={rel} style={[styles.chip, nok1?.relationship === rel && styles.chipActive]} onPress={() => setNok1((prev) => ({ ...prev, relationship: rel, phone: prev?.phone || "", firstName: prev?.firstName || "", lastName: prev?.lastName || "" }))}>
                <Text style={[styles.chipText, nok1?.relationship === rel && styles.chipTextActive]}>{rel}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.contactBtn} onPress={() => handlePickContact(setNok1)}>
            <Text style={styles.contactBtnText}>Pick from Contacts</Text>
          </Pressable>
        </View>

        <View style={styles.nokCard}>
          <Text style={styles.nokTitle}>Next of Kin 2</Text>
          <View style={styles.rowInputs}>
            <TextInput style={[styles.input, styles.rowInputItem]} placeholder="First Name" value={nok2?.firstName || ""} onChangeText={(f) => setNok2((prev) => ({ ...prev, firstName: f, phone: prev?.phone || "", lastName: prev?.lastName || "", relationship: prev?.relationship || "" }))} />
            <TextInput style={[styles.input, styles.rowInputItem]} placeholder="Last Name" value={nok2?.lastName || ""} onChangeText={(l) => setNok2((prev) => ({ ...prev, lastName: l, phone: prev?.phone || "", firstName: prev?.firstName || "", relationship: prev?.relationship || "" }))} />
          </View>
          <TextInput style={styles.input} placeholder="Phone Number" value={nok2?.phone || ""} onChangeText={(p) => setNok2((prev) => ({ ...prev, phone: p, firstName: prev?.firstName || "", lastName: prev?.lastName || "", relationship: prev?.relationship || "" }))} keyboardType="phone-pad" />
          <Text style={styles.fieldLabel}>RELATIONSHIP</Text>
          <View style={styles.chipsRow}>
            {NOK_RELATIONSHIPS.map((rel) => (
              <Pressable key={rel} style={[styles.chip, nok2?.relationship === rel && styles.chipActive]} onPress={() => setNok2((prev) => ({ ...prev, relationship: rel, phone: prev?.phone || "", firstName: prev?.firstName || "", lastName: prev?.lastName || "" }))}>
                <Text style={[styles.chipText, nok2?.relationship === rel && styles.chipTextActive]}>{rel}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.contactBtn} onPress={() => handlePickContact(setNok2)}>
            <Text style={styles.contactBtnText}>Pick from Contacts</Text>
          </Pressable>
        </View>

        <Pressable style={styles.ctaBtn} disabled={loading} onPress={handleSubmit}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.ctaInline}>
              <Text style={styles.ctaBtnText}>Continue</Text>
              <MoveRight size={18} color="#FFFFFF" strokeWidth={1.9} />
            </View>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: { backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingBottom: 28, position: "relative" },
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
  headline: { fontFamily: theme.font.extrabold, fontSize: 28, color: "#FFFFFF", lineHeight: 36, marginBottom: 4 },
  subText: { fontFamily: theme.font.body, fontSize: 13, color: "rgba(255,255,255,0.5)" },
  body: { flex: 1 },
  bodyContent: { padding: 24, paddingBottom: 40 },
  sectionTitle: { fontFamily: theme.font.bold, fontSize: 18, color: theme.colors.primary, marginBottom: 16 },
  formGroup: { marginBottom: 20 },
  fieldLabel: { fontFamily: theme.font.bold, fontSize: 10, color: theme.colors.primary, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontFamily: theme.font.body,
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: "#FFFFFF",
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontFamily: theme.font.body, fontSize: 13, color: theme.colors.textSecondary },
  chipTextActive: { color: "#FFFFFF", fontFamily: theme.font.semibold },
  errorText: { color: theme.colors.error, fontSize: 13, fontFamily: theme.font.body, marginBottom: 16 },
  ctaBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  ctaBtnText: { fontFamily: theme.font.bold, fontSize: 15, lineHeight: 18, color: "#FFFFFF" },
  ctaInline: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 1 },
  nokCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  nokTitle: { fontFamily: theme.font.bold, fontSize: 14, marginBottom: 12 },
  rowInputs: { flexDirection: "row", gap: 10, marginBottom: 10 },
  rowInputItem: { flex: 1, marginBottom: 0 },
  contactBtn: {
    backgroundColor: "rgba(30,20,96,0.05)",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  contactBtnText: { fontFamily: theme.font.bold, color: theme.colors.primary },
  hintText: { fontFamily: theme.font.body, color: theme.colors.textSecondary, marginBottom: 16 },
  suggestions: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    marginTop: -8,
    marginBottom: 12,
    overflow: "hidden",
  },
  suggestionItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  suggestionText: { fontFamily: theme.font.body, fontSize: 13, color: theme.colors.textPrimary },
  pickerTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginBottom: 10,
  },
  pickerPlaceholder: { fontFamily: theme.font.body, fontSize: 15, color: "#C8C8D8" },
  pickerValue: { fontFamily: theme.font.body, fontSize: 15, color: theme.colors.textPrimary },
  pickerArrow: { fontSize: 10, color: theme.colors.primary, opacity: 0.5 },
  dropdown: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    maxHeight: 200,
    marginBottom: 12,
    overflow: "hidden",
  },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  dropdownText: { fontFamily: theme.font.body, fontSize: 14, color: theme.colors.textPrimary },
});

