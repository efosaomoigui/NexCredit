import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { theme } from "../../theme/theme";

type Message = {
  id: number;
  type: "support" | "user";
  text: string;
  time: string;
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    type: "support",
    text: "Hello! 👋 I'm here to help with your NexCredit account. How can I assist you today?",
    time: "10:24 AM",
  },
  {
    id: 2,
    type: "user",
    text: "Hi! I wanted to check the status of my verification — it's been pending for a while.",
    time: "10:25 AM",
  },
  {
    id: 3,
    type: "support",
    text: "I've checked your account. We're currently verifying your income documents. This usually takes 4–6 hours.",
    time: "10:26 AM",
  },
];

const FAQ_ITEMS = [
  "When will my loan be disbursed?",
  "How do I increase my credit limit?",
  "Can I repay early without penalty?",
  "What happens if I miss a payment?",
];

export default function SupportScreen({ onBack }: { onBack?: () => void }) {
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const handleBack = () => {
    if (onBack) onBack();
    else navigation.goBack();
  };

  const handleSend = () => {
    if (!msg.trim()) return;
    const newMsg: Message = {
      id: messages.length + 1,
      type: "user",
      text: msg.trim(),
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setMsg("");
  };

  return (
    <View style={styles.container}>
      {/* Navy Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <View style={styles.headerContent}>
          <View style={styles.agentRow}>
            <View style={styles.agentAvatar}>
              <Text style={{ fontSize: 16 }}>🎧</Text>
            </View>
            <View>
              <Text style={styles.agentName}>NexCredit Support</Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online — typically replies in minutes</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Chat area */}
      <ScrollView
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date separator */}
        <View style={styles.dateSep}>
          <View style={styles.dateLine} />
          <Text style={styles.dateText}>TODAY</Text>
          <View style={styles.dateLine} />
        </View>

        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.msgWrapper,
              m.type === "user" ? styles.msgUser : styles.msgSupport,
            ]}
          >
            {m.type === "support" && (
              <View style={styles.msgAvatar}>
                <Text style={{ fontSize: 12 }}>NC</Text>
              </View>
            )}
            <View
              style={[
                styles.bubble,
                m.type === "user" ? styles.bubbleUser : styles.bubbleSupport,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  m.type === "user" && { color: "#FFFFFF" },
                ]}
              >
                {m.text}
              </Text>
            </View>
            <Text style={styles.msgTime}>{m.time}</Text>
          </View>
        ))}

        {/* Security notice */}
        <View style={styles.securityNote}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>
            Our agents will never ask for your PIN or bank login credentials.
          </Text>
        </View>

        {/* FAQ */}
        <Text style={styles.faqTitle}>Frequently Asked</Text>
        {FAQ_ITEMS.map((q, i) => (
          <Pressable key={i} style={styles.faqItem}>
            <Text style={styles.faqText}>{q}</Text>
            <Text style={styles.faqChevron}>›</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Input Footer */}
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type your message…"
            placeholderTextColor="#C8C8D8"
            value={msg}
            onChangeText={setMsg}
            multiline
          />
          <Pressable
            style={[styles.sendBtn, !msg.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!msg.trim()}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },

  // Header
  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingBottom: 20,
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
  headerContent: { marginTop: 32 },
  agentRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  agentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  agentName: {
    fontFamily: theme.font.bold,
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 2,
  },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4ade80",
  },
  onlineText: {
    fontFamily: theme.font.body,
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  },

  // Chat
  chatArea: { flex: 1 },
  chatContent: { padding: 20, paddingBottom: 100, gap: 4 },

  dateSep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 12,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  dateText: {
    fontFamily: theme.font.bold,
    fontSize: 10,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
  },

  msgWrapper: { maxWidth: "85%", marginBottom: 14 },
  msgUser: { alignSelf: "flex-end", alignItems: "flex-end" },
  msgSupport: { alignSelf: "flex-start", alignItems: "flex-start", flexDirection: "column" },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  bubble: {
    padding: 14,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleSupport: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontFamily: theme.font.body,
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  msgTime: {
    fontFamily: theme.font.body,
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },

  // Security note
  securityNote: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(245,166,35,0.08)",
    borderRadius: 13,
    padding: 13,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.15)",
    alignItems: "flex-start",
  },
  securityIcon: { fontSize: 14, marginTop: 1 },
  securityText: {
    flex: 1,
    fontFamily: theme.font.body,
    fontSize: 12,
    color: "#9a6a00",
    lineHeight: 19,
  },

  // FAQ
  faqTitle: {
    fontFamily: theme.font.bold,
    fontSize: 11,
    color: theme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  faqItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    padding: 15,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  faqText: {
    fontFamily: theme.font.bodyMedium,
    fontSize: 13,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  faqChevron: { fontSize: 18, color: theme.colors.textSecondary },

  // Input footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: theme.font.body,
    fontSize: 14,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.bg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#C8C8D8" },
  sendIcon: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: theme.font.bold,
  },
});
