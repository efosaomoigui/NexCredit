import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { theme } from "../../theme/theme";

import useAppRouter from "../../navigation/useAppRouter";

export default function SplashScreen() {
  const navigation = useNavigation<any>();
  const getInitialRoute = useAppRouter();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Spin the NC logo 360° once (duration 800ms, ease-in-out)
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();

    // 2. Pulse the logo card scale (1 -> 1.06 -> 1) continuously
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.06,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Routing Logic after 2.2 seconds
    const timer = setTimeout(async () => {
      const route = await getInitialRoute();
      
      // If we go to IntroSlider, mark intro as seen for next time
      if (route.name === "IntroSlider") {
        await SecureStore.setItemAsync("intro_seen", "true");
      }

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [route],
        })
      );
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigation, spinAnim, scaleAnim, getInitialRoute]);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <View style={styles.logoWrapper}>
        {/* Outer ring */}
        <View style={styles.outerRing} />

        {/* Logo Card */}
        <Animated.View
          style={[
            styles.logoCard,
            {
              transform: [{ scale: scaleAnim }, { rotate: spinInterpolate }],
            },
          ]}
        >
          <Text style={styles.ncText}>NC</Text>
        </Animated.View>
      </View>

      <Text style={styles.appName}>Monivo</Text>
      <Text style={styles.tagline}>Smart loans for smart people</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1460",
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrapper: {
    width: 148,
    height: 148,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  outerRing: {
    position: "absolute",
    width: 148,
    height: 148,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.15)", // Faint border
  },
  logoCard: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1.5,
    borderColor: "rgba(245,166,35,0.4)", // Soft gold border
    alignItems: "center",
    justifyContent: "center",
  },
  ncText: {
    color: "#F5A623",
    fontSize: 38,
    fontFamily: theme.font.bold,
  },
  appName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: theme.font.bold,
    marginTop: 12,
  },
  tagline: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontFamily: theme.font.regular,
    marginTop: 6,
  },
});

