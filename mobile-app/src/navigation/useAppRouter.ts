import { useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { getAuthoritativeResumeRoute, getCheckpoint, type ResumeRouteName } from "../lib/onboarding";

export type RouteDestination =
  | { name: "Login"; params?: { biometric: boolean } }
  | { name: ResumeRouteName }
  | { name: "LoanIntent" }
  | { name: "IntroSlider" };

/**
 * Determines which screen to show on app launch based on persisted state.
 */
export default function useAppRouter() {
  const getInitialRoute = useCallback(async (): Promise<RouteDestination> => {
    try {
      const token = await SecureStore.getItemAsync("token");
      if (token) {
        return { name: await getAuthoritativeResumeRoute(8000) };
      }

      const onboardingStep = await getCheckpoint();

      // Incomplete onboarding should continue directly at exact checkpoint screen.
      if (onboardingStep && onboardingStep !== "complete") {
        const resumeRoute = await getAuthoritativeResumeRoute(6000);
        return { name: resumeRoute };
      }

      // Completed users use PIN/biometric gate.
      if (token || onboardingStep === "complete") {
        const biometricEnabled = await SecureStore.getItemAsync("biometric_enabled");
        return {
          name: "Login",
          params: { biometric: biometricEnabled === "true" },
        };
      }

      const introSeen = await SecureStore.getItemAsync("intro_seen");
      if (introSeen === "true") {
        return { name: "PhoneEntry" };
      }

      return { name: "IntroSlider" };
    } catch {
      return { name: "IntroSlider" };
    }
  }, []);

  return getInitialRoute;
}