import React from "react";
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import {
  useFonts,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold
} from "@expo-google-fonts/sora";
import {
  useFonts as useDMSerif,
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic
} from "@expo-google-fonts/dm-serif-display";
import {
  useFonts as useDMSans,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold
} from "@expo-google-fonts/dm-sans";
import { theme } from "./src/theme/theme";
import { StoreProvider } from "./src/state/store";

const queryClient = new QueryClient();

export default function App() {
  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });

  const [dmSerifLoaded] = useDMSerif({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
  });

  const [dmSansLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  // Only block on primary fonts for a snappier startup
  if (!fontsLoaded) return null;


  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StoreProvider>
          <View style={styles.container}>
            <AppNavigator />
            <StatusBar style="auto" />
          </View>
        </StoreProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
});
