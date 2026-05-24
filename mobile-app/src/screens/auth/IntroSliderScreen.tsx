import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme/theme";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    id: "0",
    eyebrow: "Lightning Fast",
    headline: "Approved in just\n15 minutes",
    cardTitle: "Get funds fast,\nno stress.",
    cardBody: "Apply once and get a decision in under 15 minutes — any time, any day.",
    iconType: "clock",
  },
  {
    id: "1",
    eyebrow: "Up to",
    headline: "₦2,000,000",
    headlineGold: true,
    cardTitle: "Borrow up to\n₦2 million.",
    cardBody: "Flexible amounts tailored to your needs. Clear terms, zero hidden charges.",
    iconType: "card",
  },
  {
    id: "2",
    eyebrow: "Minimal Docs",
    headline: "Just your BVN\nto get started",
    cardTitle: "Only your BVN\nrequired.",
    cardBody: "No paperwork, no bank visits. Your BVN is all we need to get you started.",
    iconType: "doc",
  },
];

function SlideIcon({ type }: { type: string }) {
  if (type === "clock") {
    return (
      <View style={styles.iconBox}>
        <View style={styles.iconSvgWrap}>
          {/* Clock icon drawn with Views */}
          <View style={styles.clockOuter}>
            <View style={styles.clockHand} />
            <View style={styles.clockHandMin} />
          </View>
        </View>
      </View>
    );
  }
  if (type === "card") {
    return (
      <View style={styles.iconBox}>
        <View style={styles.cardIconOuter}>
          <View style={styles.cardIconStripe} />
          <View style={styles.cardIconDot} />
        </View>
      </View>
    );
  }
  // doc
  return (
    <View style={styles.iconBox}>
      <View style={styles.docIconOuter}>
        <View style={[styles.docLine, { width: "80%" }]} />
        <View style={[styles.docLine, { width: "65%" }]} />
        <View style={[styles.docLine, { width: "50%" }]} />
      </View>
    </View>
  );
}

export default function IntroSliderScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const goToApp = () => {
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: "LoanIntent" }] })
    );
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      goToApp();
    }
  };

  const onMomentumScrollEnd = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const activeSlide = SLIDES[currentIndex];

  const renderSlideHero = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={[styles.heroPanel, { width }]}>
      {/* Orb decorations */}
      <View style={[styles.orb, styles.orbTopRight]} />
      <View style={[styles.orb, styles.orbBottomLeft]} />

      <SlideIcon type={item.iconType} />

      <Text style={styles.eyebrow}>{item.eyebrow}</Text>
      <Text style={[styles.heroTitle, item.headlineGold && styles.heroTitleGold]}>
        {item.headline}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Hero top */}
      <View style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          renderItem={renderSlideHero}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
        />
      </View>

      {/* White card bottom */}
      <View style={styles.cardPanel}>
        {/* Mini logo + pill progress */}
        <View style={styles.cardHead}>
          <View style={styles.miniLogo}>
            <View style={styles.miniBox}>
              <Text style={styles.miniBoxText}>NC</Text>
            </View>
            <Text style={styles.miniName}>Monivo</Text>
          </View>
          <View style={styles.pillsRow}>
            {SLIDES.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.pill,
                  currentIndex === idx ? styles.pillActive : styles.pillInactive,
                ]}
              />
            ))}
          </View>
        </View>

        <Text style={styles.cardTitle}>{activeSlide.cardTitle}</Text>
        <Text style={styles.cardBody}>{activeSlide.cardBody}</Text>

        <View style={styles.footer}>
          <Pressable onPress={goToApp} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
          <Pressable onPress={handleNext} style={styles.nextBtn}>
            <Text style={styles.nextBtnText}>
              {currentIndex === SLIDES.length - 1 ? "Get started ✓" : "Next →"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  heroPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 20,
    position: "relative",
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    borderRadius: 9999,
  },
  orbTopRight: {
    width: 280,
    height: 280,
    top: -80,
    right: -60,
    backgroundColor: "rgba(245,166,35,0.06)",
  },
  orbBottomLeft: {
    width: 180,
    height: 180,
    bottom: 10,
    left: -50,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  iconBox: {
    width: 118,
    height: 118,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(245,166,35,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  iconSvgWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  // Clock icon
  clockOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    borderColor: "#F5A623",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  clockHand: {
    position: "absolute",
    width: 2,
    height: 14,
    backgroundColor: "#F5A623",
    bottom: "50%",
    left: "50%",
    marginLeft: -1,
    borderRadius: 1,
    transformOrigin: "bottom",
  },
  clockHandMin: {
    position: "absolute",
    width: 2,
    height: 10,
    backgroundColor: "#F5A623",
    bottom: "50%",
    left: "50%",
    marginLeft: -1,
    transform: [{ rotate: "90deg" }, { translateY: -5 }],
    borderRadius: 1,
  },
  // Card icon
  cardIconOuter: {
    width: 50,
    height: 36,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: "#F5A623",
    overflow: "hidden",
    position: "relative",
    alignItems: "flex-start",
    justifyContent: "flex-end",
    padding: 6,
  },
  cardIconStripe: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: "#F5A623",
    opacity: 0.4,
  },
  cardIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F5A623",
  },
  // Doc icon
  docIconOuter: {
    width: 40,
    height: 50,
    borderRadius: 5,
    borderWidth: 2.5,
    borderColor: "#F5A623",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 8,
  },
  docLine: {
    height: 2.5,
    backgroundColor: "#F5A623",
    borderRadius: 1,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.38)",
    fontSize: 11,
    fontFamily: theme.font.semibold,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontFamily: theme.font.extrabold,
    textAlign: "center",
    lineHeight: 34,
  },
  heroTitleGold: {
    color: "#F5A623",
    fontSize: 34,
  },
  // White card
  cardPanel: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    marginTop: -28,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  miniLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  miniBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  miniBoxText: {
    color: theme.colors.accent,
    fontFamily: theme.font.extrabold,
    fontSize: 10,
  },
  miniName: {
    fontFamily: theme.font.bold,
    fontSize: 12,
    color: theme.colors.primary,
  },
  pillsRow: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },
  pill: {
    height: 4,
    borderRadius: 2,
  },
  pillActive: {
    width: 22,
    backgroundColor: theme.colors.primary,
  },
  pillInactive: {
    width: 8,
    backgroundColor: theme.colors.border,
  },
  cardTitle: {
    fontFamily: theme.font.bold,
    fontSize: 21,
    color: theme.colors.textPrimary,
    lineHeight: 28,
    marginBottom: 8,
  },
  cardBody: {
    fontFamily: theme.font.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 21,
    marginBottom: 22,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  skipText: {
    fontFamily: theme.font.bodyMedium,
    fontSize: 13,
    color: "#C8C8DA",
  },
  nextBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 28,
  },
  nextBtnText: {
    fontFamily: theme.font.bold,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
});
